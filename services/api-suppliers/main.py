import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routers.suppliers import router as suppliers_router


logger = logging.getLogger(__name__)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(suppliers_router)


@app.exception_handler(RequestValidationError)
async def request_validation_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    # Pydantic's default 422 response includes the rejected input. Do not return
    # request values (which may contain personal or confidential supplier data).
    safe_errors = [
        {
            "loc": list(error.get("loc", ())),
            "type": error.get("type", "value_error"),
        }
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={"detail": safe_errors},
    )


@app.middleware("http")
async def unhandled_exception_middleware(
    request: Request,
    call_next,
):
    try:
        return await call_next(request)
    except Exception as exc:
        route = request.scope.get("route")
        route_template = getattr(route, "path", "unknown")
        # Avoid exception text/tracebacks here: they can contain request data,
        # filesystem paths, or other internal details. Returning here also
        # prevents the ASGI server from logging the raw exception traceback.
        logger.error(
            "Unhandled API error (%s) for %s %s",
            type(exc).__name__,
            request.method,
            route_template,
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )


@app.get("/")
def health_check():
    return {"message": "API working"}

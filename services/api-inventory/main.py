import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from database import create_db_and_tables
from routers.inventory import router as inventory_router


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title="Brasaland Inventory API", lifespan=lifespan)
app.include_router(inventory_router)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request: Request, exc: RequestValidationError):
    # Do not echo rejected values in API errors.
    return JSONResponse(
        status_code=422,
        content={
            "detail": [
                {"loc": list(error.get("loc", ())), "type": error.get("type", "value_error")}
                for error in exc.errors()
            ]
        },
    )


@app.get("/")
def health_check():
    return {"message": "Inventory API working"}

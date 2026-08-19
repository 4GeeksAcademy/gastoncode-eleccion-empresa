from fastapi import FastAPI

from .routers.suppliers import router as suppliers_router


app = FastAPI()


@app.get("/")
def health_check():
    return {"message": "API working"}


app.include_router(suppliers_router)
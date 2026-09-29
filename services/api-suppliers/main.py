from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.suppliers import router as suppliers_router


app = FastAPI()


@app.get("/")
def health_check():
    return {"message": "API working"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(suppliers_router)
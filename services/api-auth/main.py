from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth import router as auth_router
from profiles import router as profiles_router
from users import router as users_router


app = FastAPI(
    title="Company API"
)

app.include_router(users_router)
app.include_router(profiles_router)
app.include_router(auth_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "API funcionando"
    }

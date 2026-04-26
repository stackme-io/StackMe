from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.db import engine, Base
from core.models.user_module import UserModule  # noqa: F401 — registers model
from core.routers.users import router as users_router
from core.routers.modules import router as modules_router

app = FastAPI(title="StackMe Core API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables on startup
Base.metadata.create_all(bind=engine)


@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "StackMe Core API is running",
        "version": "0.1.0"
    }

app.include_router(users_router, prefix="/api", tags=["Users"])
app.include_router(modules_router, prefix="/api", tags=["Modules"])

# Services
try:
    from forge_me.router import router as forge_router
    app.include_router(forge_router, prefix="/forge-me", tags=["ForgeMe"])
    print("✓ ForgeMe service loaded")
except ImportError:
    print("⚠ ForgeMe service not available")
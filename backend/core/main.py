from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.db import engine, Base
from core.models.user_module import UserModule  # noqa: F401 — registers model
from core.routers.users import router as users_router
from core.routers.modules import router as modules_router

import os
app = FastAPI(
    title="StackMe Core API",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url=None
)

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
except Exception as e:
    print(f"⚠ ForgeMe service not available: {e}")
    import traceback
    traceback.print_exc()

try:
    from analyze_me.router import router as analyze_router
    app.include_router(analyze_router, prefix="/analyze-me", tags=["AnalyzeMe"])
    print("✓ AnalyzeMe service loaded")
except Exception as e:
    print(f"⚠ AnalyzeMe service not available: {e}")
    import traceback
    traceback.print_exc()
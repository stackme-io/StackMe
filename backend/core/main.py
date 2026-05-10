from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from core.db import engine, Base
from core.models.user_module import UserModule  # noqa: F401 — registers model
from core.routers.users import router as users_router
from core.routers.modules import router as modules_router

limiter = Limiter(key_func=get_remote_address, default_limits=["20/minute"])

app = FastAPI(
    title="StackMe Core API",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url=None
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://stackme-app.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
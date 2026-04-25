from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="StackMe Core API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Проверка статуса API"""
    return {
        "status": "online",
        "message": "StackMe Core API is running",
        "version": "0.1.0"
    }

# Подключение сервисов
try:
    from forge_me.router import router as forge_router
    app.include_router(forge_router, prefix="/forge-me", tags=["ForgeMe"])
    print("✓ ForgeMe service loaded")
except ImportError:
    print("⚠ ForgeMe service not available")

from core.routers.users import router as users_router
app.include_router(users_router, prefix="/api", tags=["Users"])
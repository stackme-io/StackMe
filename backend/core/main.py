from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from core.rate_limit import limiter
from core.db import engine, Base
from core.models.user_module import UserModule  # noqa: F401 — registers model
from core.models.user_profile import UserProfile  # noqa: F401 — registers model
from core.models.roadmap_vote import RoadmapVote  # noqa: F401 — registers model
from core.models.suggestion import Suggestion  # noqa: F401 — registers model
from core.models.suggestion_vote import SuggestionVote  # noqa: F401 — registers model
from core.models.notification import Notification, NotificationRead  # noqa: F401 — registers models
from core.models.locate_report import LocateReport  # noqa: F401 — registers model
from core.models.contact_message import ContactMessage  # noqa: F401 — registers model
from core.routers.users import router as users_router
from core.routers.modules import router as modules_router
from core.routers.roadmap import router as roadmap_router
from core.routers.suggestions import router as suggestions_router
from core.routers.admin import router as admin_router
from core.routers.notifications import router as notifications_router
from core.routers.locate_reports import router as locate_reports_router
from core.routers.contact import router as contact_router

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
app.include_router(roadmap_router, prefix="/api", tags=["Roadmap"])
app.include_router(suggestions_router, prefix="/api", tags=["Suggestions"])
app.include_router(admin_router, prefix="/api", tags=["Admin"])
app.include_router(notifications_router, prefix="/api", tags=["Notifications"])
app.include_router(locate_reports_router, prefix="/api", tags=["LocateReports"])
app.include_router(contact_router, prefix="/api", tags=["Contact"])

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
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.auth import get_current_user
from core.db import get_db
from core.models.suggestion import Suggestion
from core.models.notification import Notification

router = APIRouter()

ADMIN_USER_IDS = set(filter(None, os.getenv("ADMIN_USER_IDS", "").split(",")))


def _require_admin(user: dict) -> None:
    if not ADMIN_USER_IDS or user.get("sub", "") not in ADMIN_USER_IDS:
        raise HTTPException(status_code=403, detail="Admin only")


@router.post("/admin/suggestions/{suggestion_id}/publish")
async def publish_suggestion(
    suggestion_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    _require_admin(user)

    suggestion = db.query(Suggestion).filter(Suggestion.id == suggestion_id).first()
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    if suggestion.published:
        raise HTTPException(status_code=409, detail="Already published")

    suggestion.published = True

    module_label = suggestion.module_id.replace("-", " ").title()
    notification = Notification(
        user_id=suggestion.user_id,
        type="suggestion_published",
        title=f"Your {module_label} suggestion is now live 🎉",
        body=f'"{suggestion.text[:120]}{"..." if len(suggestion.text) > 120 else ""}"',
    )
    db.add(notification)
    db.commit()

    return {
        "id": suggestion.id,
        "published": True,
        "notification_id": notification.id,
    }

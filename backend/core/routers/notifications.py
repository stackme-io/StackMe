import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from core.auth import get_current_user
from core.db import get_db
from core.models.notification import Notification, NotificationRead

router = APIRouter()

ADMIN_USER_IDS = set(filter(None, os.getenv("ADMIN_USER_IDS", "").split(",")))

VALID_TYPES = {"suggestion_published", "new_version", "survey", "announcement"}


def _require_admin(user: dict) -> None:
    if not ADMIN_USER_IDS or user.get("sub", "") not in ADMIN_USER_IDS:
        raise HTTPException(status_code=403, detail="Admin only")


def _is_read(notification: Notification, user_id: str, read_ids: set[int]) -> bool:
    return notification.id in read_ids


@router.get("/notifications")
async def get_notifications(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    user_id = user.get("sub", "")

    notifications = (
        db.query(Notification)
        .filter(
            or_(Notification.user_id == user_id, Notification.user_id == None)  # noqa: E711
        )
        .order_by(Notification.created_at.desc())
        .all()
    )

    read_ids = {
        r.notification_id
        for r in db.query(NotificationRead.notification_id)
        .filter(NotificationRead.user_id == user_id)
        .all()
    }

    return [
        {
            "id": n.id,
            "type": n.type,
            "title": n.title,
            "body": n.body,
            "created_at": n.created_at.isoformat(),
            "read": n.id in read_ids,
            "broadcast": n.user_id is None,
        }
        for n in notifications
    ]


@router.get("/notifications/unread-count")
async def get_unread_count(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    user_id = user.get("sub", "")

    total = (
        db.query(Notification)
        .filter(or_(Notification.user_id == user_id, Notification.user_id == None))  # noqa: E711
        .count()
    )

    read_count = (
        db.query(NotificationRead)
        .join(Notification, Notification.id == NotificationRead.notification_id)
        .filter(
            NotificationRead.user_id == user_id,
            or_(Notification.user_id == user_id, Notification.user_id == None),  # noqa: E711
        )
        .count()
    )

    return {"unread": total - read_count}


@router.post("/notifications/{notification_id}/read", status_code=200)
async def mark_read(
    notification_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    user_id = user.get("sub", "")
    record = NotificationRead(user_id=user_id, notification_id=notification_id)
    db.add(record)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
    return {"ok": True}


@router.post("/notifications/read-all", status_code=200)
async def mark_all_read(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    user_id = user.get("sub", "")

    notifications = (
        db.query(Notification.id)
        .filter(or_(Notification.user_id == user_id, Notification.user_id == None))  # noqa: E711
        .all()
    )

    already_read = {
        r.notification_id
        for r in db.query(NotificationRead.notification_id)
        .filter(NotificationRead.user_id == user_id)
        .all()
    }

    for (nid,) in notifications:
        if nid not in already_read:
            db.add(NotificationRead(user_id=user_id, notification_id=nid))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()

    return {"ok": True}


class AdminNotificationIn(BaseModel):
    type: str = Field(..., pattern="^(new_version|survey|announcement)$")
    title: str = Field(..., max_length=255)
    body: str | None = Field(None, max_length=2000)
    user_id: str | None = None  # null = broadcast


@router.post("/admin/notifications", status_code=201)
async def create_notification(
    body: AdminNotificationIn,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    _require_admin(user)

    notification = Notification(
        user_id=body.user_id,
        type=body.type,
        title=body.title,
        body=body.body,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return {"id": notification.id, "type": notification.type, "broadcast": notification.user_id is None}

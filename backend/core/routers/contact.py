from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from core.auth import get_optional_user
from core.db import get_db
from core.rate_limit import limiter
from core.models.contact_message import ContactMessage

router = APIRouter()

VALID_CATEGORIES = {"bug", "idea", "partnership", "other"}


class ContactIn(BaseModel):
    message: str = Field(..., min_length=10, max_length=1000)
    email: str | None = Field(default=None, max_length=255)
    category: str | None = None
    website: str | None = None  # honeypot - real users leave this empty


@router.post("/contact", status_code=201)
@limiter.limit("3/hour")
async def create_contact(
    request: Request,
    body: ContactIn,
    db: Session = Depends(get_db),
    user: dict | None = Depends(get_optional_user),
):
    # Honeypot: bots fill hidden fields. Pretend success, store nothing.
    if body.website:
        return {"status": "ok"}

    category = body.category if body.category in VALID_CATEGORIES else None
    email = (body.email or "").strip()[:255] or None
    user_id = user.get("sub") if user else None

    msg = ContactMessage(
        message=body.message.strip(),
        email=email,
        category=category,
        user_id=user_id,
    )
    db.add(msg)
    db.commit()
    return {"status": "ok"}

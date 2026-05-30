import os
import httpx
import resend
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.auth import get_current_user
from core.db import get_db
from core.models.suggestion import Suggestion

router = APIRouter()

ADMIN_USER_IDS = set(filter(None, os.getenv("ADMIN_USER_IDS", "").split(",")))
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@stackme.app")
SITE_URL = os.getenv("SITE_URL", "https://stackme-app.vercel.app")

resend.api_key = RESEND_API_KEY

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")


async def _get_user_email(user_id: str) -> str | None:
    """Fetch user email from Clerk API."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://api.clerk.com/v1/users/{user_id}",
                headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"},
                timeout=5,
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
            emails = data.get("email_addresses", [])
            primary_id = data.get("primary_email_address_id")
            for e in emails:
                if e.get("id") == primary_id:
                    return e.get("email_address")
            return emails[0].get("email_address") if emails else None
    except Exception:
        return None


def _require_admin(user: dict) -> None:
    user_id = user.get("sub", "")
    if not ADMIN_USER_IDS or user_id not in ADMIN_USER_IDS:
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
    db.commit()

    # Send email notification to the author
    author_email = await _get_user_email(suggestion.user_id)
    email_sent = False

    if author_email and RESEND_API_KEY:
        try:
            module_label = suggestion.module_id.replace("-", " ").title()
            resend.Emails.send({
                "from": FROM_EMAIL,
                "to": author_email,
                "subject": f"Your suggestion for {module_label} is now live 🎉",
                "html": f"""
                <p>Hi,</p>
                <p>Your suggestion has been published on the <strong>{module_label}</strong> roadmap:</p>
                <blockquote style="border-left:3px solid #ccc;padding:8px 16px;color:#555">
                  {suggestion.text}
                </blockquote>
                <p>Other users can now vote on it. Thank you for helping shape StackMe!</p>
                <p><a href="{SITE_URL}">View on StackMe</a></p>
                """,
            })
            email_sent = True
        except Exception:
            pass  # don't fail the publish if email fails

    return {
        "id": suggestion.id,
        "published": True,
        "email_sent": email_sent,
        "author_email": author_email,
    }

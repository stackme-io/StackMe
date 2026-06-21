from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from core.auth import get_current_user, get_optional_user
from core.db import get_db
from core.models.suggestion import Suggestion
from core.models.suggestion_vote import SuggestionVote
from core.models.user_profile import UserProfile

router = APIRouter()

VALID_MODULES = {"forge-me", "analyze-me", "locate-me"}

ALICE_CHARACTERS = [
    "hatter", "cheshire", "rabbit", "dormouse",
    "dodo", "duchess", "caterpillar", "knave",
]


def get_anon_name(user_id: str) -> str:
    """Deterministic Alice character + last 5 chars of user_id."""
    idx = sum(ord(c) for c in user_id) % len(ALICE_CHARACTERS)
    character = ALICE_CHARACTERS[idx]
    suffix = user_id[-5:] if len(user_id) >= 5 else user_id
    return f"{character}·{suffix}"


def get_display_name(suggestion: Suggestion) -> str:
    if suggestion.show_username and suggestion.username:
        return suggestion.username
    return get_anon_name(suggestion.user_id)


class SuggestionIn(BaseModel):
    module_id: str
    text: str = Field(..., min_length=10, max_length=1000)
    show_username: bool = False


@router.post("/suggestions", status_code=201)
async def create_suggestion(
    body: SuggestionIn,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    if body.module_id not in VALID_MODULES:
        raise HTTPException(status_code=400, detail="Invalid module_id")

    user_id = user.get("sub", "")
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    nickname = profile.nickname if profile and profile.nickname else None

    suggestion = Suggestion(
        user_id=user_id,
        module_id=body.module_id,
        text=body.text,
        username=nickname,
        show_username=body.show_username,
        published=False,
    )
    db.add(suggestion)
    db.commit()
    db.refresh(suggestion)
    return {"id": suggestion.id, "status": "pending"}


@router.get("/suggestions/{module}")
async def get_suggestions(
    module: str,
    db: Session = Depends(get_db),
    user: dict | None = Depends(get_optional_user),
):
    if module not in VALID_MODULES:
        raise HTTPException(status_code=404, detail="Module not found")

    rows = (
        db.query(
            Suggestion,
            func.count(SuggestionVote.id).label("vote_count"),
        )
        .outerjoin(SuggestionVote, SuggestionVote.suggestion_id == Suggestion.id)
        .filter(Suggestion.module_id == module, Suggestion.published == True)  # noqa: E712
        .group_by(Suggestion.id)
        .order_by(func.count(SuggestionVote.id).desc(), Suggestion.created_at.desc())
        .all()
    )

    user_id = user.get("sub", "") if user else ""
    user_votes = set()
    if user_id:
        voted_ids = (
            db.query(SuggestionVote.suggestion_id)
            .filter(SuggestionVote.user_id == user_id)
            .all()
        )
        user_votes = {v.suggestion_id for v in voted_ids}

    return [
        {
            "id": s.id,
            "text": s.text,
            "display_name": get_display_name(s),
            "created_at": s.created_at.isoformat(),
            "vote_count": vote_count,
            "user_voted": s.id in user_votes,
        }
        for s, vote_count in rows
    ]


@router.post("/suggestions/{suggestion_id}/vote", status_code=201)
async def vote_suggestion(
    suggestion_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    suggestion = db.query(Suggestion).filter(
        Suggestion.id == suggestion_id, Suggestion.published == True  # noqa: E712
    ).first()
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    vote = SuggestionVote(user_id=user.get("sub", ""), suggestion_id=suggestion_id)
    db.add(vote)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Already voted")

    total = (
        db.query(func.count())
        .filter(SuggestionVote.suggestion_id == suggestion_id)
        .scalar()
    )
    return {"suggestion_id": suggestion_id, "total": total}


@router.delete("/suggestions/{suggestion_id}/vote", status_code=200)
async def unvote_suggestion(
    suggestion_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    vote = db.query(SuggestionVote).filter(
        SuggestionVote.user_id == user.get("sub", ""),
        SuggestionVote.suggestion_id == suggestion_id,
    ).first()
    if not vote:
        raise HTTPException(status_code=404, detail="Vote not found")

    db.delete(vote)
    db.commit()

    total = (
        db.query(func.count())
        .filter(SuggestionVote.suggestion_id == suggestion_id)
        .scalar()
    )
    return {"suggestion_id": suggestion_id, "total": total}

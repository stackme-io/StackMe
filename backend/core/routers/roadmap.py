from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from core.auth import get_current_user, get_optional_user
from core.db import get_db
from core.models.roadmap_vote import RoadmapVote

router = APIRouter()

VALID_MODULES = {"forge-me", "analyze-me"}


def _check_module(module: str) -> None:
    if module not in VALID_MODULES:
        raise HTTPException(status_code=404, detail="Module not found")


@router.get("/roadmap/{module}/votes")
async def get_votes(
    module: str,
    db: Session = Depends(get_db),
    user: dict | None = Depends(get_optional_user),
):
    _check_module(module)

    rows = (
        db.query(RoadmapVote.item_key, func.count().label("cnt"))
        .filter(RoadmapVote.module_id == module)
        .group_by(RoadmapVote.item_key)
        .all()
    )
    counts = {row.item_key: row.cnt for row in rows}

    user_votes: list[str] = []
    if user:
        user_id = user.get("sub", "")
        user_votes = [
            v.item_key
            for v in db.query(RoadmapVote.item_key)
            .filter(RoadmapVote.module_id == module, RoadmapVote.user_id == user_id)
            .all()
        ]

    return {"counts": counts, "user_votes": user_votes}


@router.post("/roadmap/{module}/vote/{item_key}", status_code=201)
async def add_vote(
    module: str,
    item_key: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    _check_module(module)
    user_id = user.get("sub", "")

    vote = RoadmapVote(user_id=user_id, module_id=module, item_key=item_key)
    db.add(vote)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Already voted")

    total = (
        db.query(func.count())
        .filter(RoadmapVote.module_id == module, RoadmapVote.item_key == item_key)
        .scalar()
    )
    return {"item_key": item_key, "total": total}


@router.delete("/roadmap/{module}/vote/{item_key}", status_code=200)
async def remove_vote(
    module: str,
    item_key: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    _check_module(module)
    user_id = user.get("sub", "")

    deleted = (
        db.query(RoadmapVote)
        .filter(
            RoadmapVote.user_id == user_id,
            RoadmapVote.module_id == module,
            RoadmapVote.item_key == item_key,
        )
        .first()
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Vote not found")

    db.delete(deleted)
    db.commit()

    total = (
        db.query(func.count())
        .filter(RoadmapVote.module_id == module, RoadmapVote.item_key == item_key)
        .scalar()
    )
    return {"item_key": item_key, "total": total}

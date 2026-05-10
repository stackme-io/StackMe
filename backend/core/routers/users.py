from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from core.auth import get_current_user
from core.db import get_db
from core.models.user_profile import UserProfile

router = APIRouter()


class NicknameUpdate(BaseModel):
    nickname: str


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user.get("sub"),
        "email": user.get("email"),
        "first_name": user.get("first_name"),
    }


@router.get("/me/profile")
async def get_profile(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = user.get("sub")
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    return {
        "user_id": user_id,
        "nickname": profile.nickname if profile else None,
    }


@router.patch("/me/profile")
async def update_profile(
    body: NicknameUpdate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = user.get("sub")
    if len(body.nickname.strip()) > 50:
        raise HTTPException(status_code=400, detail="Nickname too long")

    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if profile:
        profile.nickname = body.nickname.strip()
    else:
        profile = UserProfile(user_id=user_id, nickname=body.nickname.strip())
        db.add(profile)
    db.commit()
    return {"nickname": profile.nickname}
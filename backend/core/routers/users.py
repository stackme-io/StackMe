from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from core.auth import get_current_user
from core.db import get_db
from core.models.user_profile import UserProfile
from core.models.user_module import UserModule

router = APIRouter()

DEFAULT_MODULES = ["forge-me", "analyze-me"]


class NicknameUpdate(BaseModel):
    nickname: str


def ensure_default_modules(user_id: str, db: Session):
    for module_id in DEFAULT_MODULES:
        exists = db.query(UserModule).filter(
            UserModule.user_id == user_id,
            UserModule.module_id == module_id
        ).first()
        if not exists:
            db.add(UserModule(user_id=user_id, module_id=module_id))
    db.commit()


@router.get("/me")
async def get_me(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = user.get("sub")
    ensure_default_modules(user_id, db)
    return {
        "user_id": user_id,
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

    nickname = body.nickname.strip()
    existing = db.query(UserProfile).filter(
        UserProfile.nickname == nickname,
        UserProfile.user_id != user_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Nickname already taken")

    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if profile:
        profile.nickname = nickname
    else:
        profile = UserProfile(user_id=user_id, nickname=nickname)
        db.add(profile)
    db.commit()
    return {"nickname": profile.nickname}
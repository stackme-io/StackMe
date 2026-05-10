from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from core.auth import get_current_user
from core.db import get_db
from core.models.user_module import UserModule

router = APIRouter()

DEFAULT_MODULES = ["forge-me", "analyze-me"]


class ActivateRequest(BaseModel):
    module_id: str


def ensure_default_modules(user_id: str, db: Session):
    for module_id in DEFAULT_MODULES:
        exists = db.query(UserModule).filter(
            UserModule.user_id == user_id,
            UserModule.module_id == module_id
        ).first()
        if not exists:
            db.add(UserModule(user_id=user_id, module_id=module_id))
    db.commit()


@router.get("/me/modules")
async def get_my_modules(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = user.get("sub")
    ensure_default_modules(user_id, db)
    modules = db.query(UserModule).filter(UserModule.user_id == user_id).all()
    return {"modules": [m.module_id for m in modules]}


@router.post("/modules/activate")
async def activate_module(
    request: ActivateRequest,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = user.get("sub")
    existing = db.query(UserModule).filter(
        UserModule.user_id == user_id,
        UserModule.module_id == request.module_id
    ).first()
    if existing:
        return {"status": "already_active", "module_id": request.module_id}
    module = UserModule(user_id=user_id, module_id=request.module_id)
    db.add(module)
    db.commit()
    return {"status": "activated", "module_id": request.module_id}


@router.delete("/modules/{module_id}")
async def deactivate_module(
    module_id: str,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = user.get("sub")
    module = db.query(UserModule).filter(
        UserModule.user_id == user_id,
        UserModule.module_id == module_id
    ).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    db.delete(module)
    db.commit()
    return {"status": "deactivated", "module_id": module_id}
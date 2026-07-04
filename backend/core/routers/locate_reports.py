import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from core.auth import get_current_user
from core.db import get_db
from core.models.locate_report import LocateReport

router = APIRouter()

MAX_REPORTS = 50


class ReportCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    data: dict           # full ReportData JSON
    fragile: int = 0
    total: int = 0
    files: int = 0


@router.post("/locate/reports")
async def save_report(
    body: ReportCreate,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = user.get("sub")
    title = body.title.strip()[:200] or "Untitled audit"
    count = db.query(LocateReport).filter(LocateReport.user_id == user_id).count()
    if count >= MAX_REPORTS:
        raise HTTPException(status_code=409, detail=f"Saved report limit reached ({MAX_REPORTS}). Delete some first.")
    duplicate = (
        db.query(LocateReport)
        .filter(LocateReport.user_id == user_id, LocateReport.title == title)
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="name_taken")
    report = LocateReport(
        user_id=user_id,
        title=title,
        data=json.dumps(body.data),
        fragile=body.fragile,
        total=body.total,
        files=body.files,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return {"id": report.id}


@router.get("/locate/reports")
async def list_reports(
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = user.get("sub")
    rows = (
        db.query(LocateReport)
        .filter(LocateReport.user_id == user_id)
        .order_by(LocateReport.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "title": r.title,
            "fragile": r.fragile,
            "total": r.total,
            "files": r.files,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


@router.get("/locate/reports/{report_id}")
async def get_report(
    report_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = user.get("sub")
    r = (
        db.query(LocateReport)
        .filter(LocateReport.id == report_id, LocateReport.user_id == user_id)
        .first()
    )
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"id": r.id, "title": r.title, "data": json.loads(r.data), "created_at": r.created_at.isoformat()}


@router.delete("/locate/reports/{report_id}")
async def delete_report(
    report_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id = user.get("sub")
    r = (
        db.query(LocateReport)
        .filter(LocateReport.id == report_id, LocateReport.user_id == user_id)
        .first()
    )
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(r)
    db.commit()
    return {"ok": True}

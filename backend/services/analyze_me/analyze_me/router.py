import io
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from analyze_me.detectors import detect_all


router = APIRouter()


class AnomalyInfo(BaseModel):
    row_index: int
    column: str
    anomaly_type: str
    original_value: str
    description: str


class AnalyzeResponse(BaseModel):
    rows_total: int
    anomalies_count: int
    anomalies: list[AnomalyInfo]


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "analyze-me"}


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(file: UploadFile = File(...)) -> AnalyzeResponse:
    content = await file.read()

    try:
        df = pd.read_csv(io.StringIO(content.decode("utf-8")))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid CSV file")

    records = detect_all(df)

    anomalies = [
        AnomalyInfo(
            row_index=r.row_index,
            column=r.column,
            anomaly_type=r.anomaly_type,
            original_value=r.original_value,
            description=r.description,
        )
        for r in records
    ]

    return AnalyzeResponse(
        rows_total=len(df),
        anomalies_count=len(anomalies),
        anomalies=anomalies,
    )
from .schemas import GenerateRequest, GenerateResponse, AnomalyInfo, AnomalyType, AnalyzeResponse
from .anomaly_engine import generate_clean_dataset, inject_anomalies, serialize_dataset
from fastapi import APIRouter, UploadFile, File
import io

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok", "service": "forge-me"}


@router.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    df = generate_clean_dataset(rows=request.rows)

    df_with_anomalies, anomaly_records = inject_anomalies(
        df,
        anomaly_rate=request.anomaly_rate,
    )

    anomalies = [
        AnomalyInfo(
            row_index=a.row_index,
            column=a.column,
            anomaly_type=AnomalyType(a.anomaly_type),
            original_value=a.original_value,
            description=a.description,
        )
        for a in anomaly_records
    ]

    data = serialize_dataset(df_with_anomalies, request.format.value)

    return GenerateResponse(
        format=request.format,
        rows_total=len(df_with_anomalies),
        anomalies_count=len(anomalies),
        anomalies=anomalies,
        data=data,
    )

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(file: UploadFile = File(...)):
    content = await file.read()

    try:
        import pandas as pd
        df = pd.read_csv(io.StringIO(content.decode("utf-8")))
    except Exception:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid CSV file")

    from .anomaly_engine import detect_anomalies
    anomaly_records = detect_anomalies(df)

    anomalies = [
        AnomalyInfo(
            row_index=a.row_index,
            column=a.column,
            anomaly_type=AnomalyType(a.anomaly_type),
            original_value=a.original_value,
            description=a.description,
        )
        for a in anomaly_records
    ]

    return AnalyzeResponse(
        rows_total=len(df),
        anomalies_count=len(anomalies),
        anomalies=anomalies,
    )
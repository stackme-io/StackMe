from fastapi import APIRouter
from .schemas import GenerateRequest, GenerateResponse, AnomalyInfo, AnomalyType
from .anomaly_engine import generate_clean_dataset, inject_anomalies, serialize_dataset

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
from .schemas import GenerateRequest, GenerateResponse, AnomalyInfo, AnomalyType, AnalyzeResponse
from .anomaly_engine import generate_clean_dataset, inject_anomalies, serialize_dataset
from .injectors import INJECTORS
from fastapi import APIRouter, UploadFile, File
import io
import numpy as np
import pandas as pd

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok", "service": "forge-me"}


def generate_schema_dataset(rows: int, seed: int, schema_fields: list) -> pd.DataFrame:
    """Generates a dataset using user-provided schema field names and types."""
    rng = np.random.default_rng(seed)
    data = {}

    for field in schema_fields:
        name = field.name
        ftype = field.type

        if ftype == "int":
            data[name] = rng.integers(low=1000, high=9999, size=rows).tolist()
        elif ftype == "float":
            data[name] = rng.normal(loc=100.0, scale=10.0, size=rows).round(2).tolist()
        elif ftype == "timestamp":
            data[name] = pd.date_range(
                start="2024-01-01", periods=rows, freq="h"
            ).astype(str).tolist()
        else:
            data[name] = [f"{name}_{i + 1}" for i in range(rows)]

    return pd.DataFrame(data)


@router.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    active_types = request.anomaly_types or []

    if request.schema:
        df = generate_schema_dataset(
            rows=request.rows,
            seed=request.seed,
            schema_fields=request.schema,
        )
    else:
        df = generate_clean_dataset(rows=request.rows, seed=request.seed)

    df_with_anomalies, anomaly_records = inject_anomalies(
        df,
        anomaly_rate=request.anomaly_rate,
        seed=request.seed,
        anomaly_types=active_types,
    )

    valid_types = set(AnomalyType.__members__.values())
    anomalies = []
    for a in anomaly_records:
        try:
            atype = AnomalyType(a.anomaly_type)
        except ValueError:
            continue
        anomalies.append(AnomalyInfo(
            row_index=a.row_index,
            column=a.column,
            anomaly_type=atype,
            original_value=a.original_value,
            description=a.description,
        ))

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
        df = pd.read_csv(io.StringIO(content.decode("utf-8")))
    except Exception:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid CSV file")

    from .anomaly_engine import detect_anomalies
    anomaly_records = detect_anomalies(df)

    anomalies = []
    for a in anomaly_records:
        try:
            atype = AnomalyType(a.anomaly_type)
        except ValueError:
            continue
        anomalies.append(AnomalyInfo(
            row_index=a.row_index,
            column=a.column,
            anomaly_type=atype,
            original_value=a.original_value,
            description=a.description,
        ))

    return AnalyzeResponse(
        rows_total=len(df),
        anomalies_count=len(anomalies),
        anomalies=anomalies,
    )
from .schemas import GenerateRequest, GenerateResponse, AnomalyInfo, AnomalyType, AnalyzeResponse
from .anomaly_engine import generate_clean_dataset, inject_anomalies, serialize_dataset
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
            # string — generate readable placeholders
            data[name] = [f"{name}_{i+1}" for i in range(rows)]

    return pd.DataFrame(data)


def inject_schema_anomalies(
    df: pd.DataFrame,
    anomaly_rate: float,
    seed: int,
) -> tuple[pd.DataFrame, list]:
    """Injects anomalies into a schema-based dataset."""
    from .anomaly_engine import AnomalyRecord
    rng = np.random.default_rng(seed)
    df = df.copy()
    anomalies = []

    n_anomalies = max(1, int(len(df) * anomaly_rate))
    anomaly_rows = rng.choice(len(df), size=n_anomalies, replace=False)

    third = max(1, n_anomalies // 3)
    outlier_rows = anomaly_rows[:third]
    missing_rows = anomaly_rows[third:third * 2]
    duplicate_rows = anomaly_rows[third * 2:]

    # pick first numeric column for outliers
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    float_cols = [c for c in numeric_cols if df[c].dtype == float]
    outlier_col = float_cols[0] if float_cols else (numeric_cols[0] if numeric_cols else None)

    if outlier_col:
        for row in outlier_rows:
            original = df.at[row, outlier_col]
            df.at[row, outlier_col] = round(float(original) * 10, 2)
            anomalies.append(AnomalyRecord(
                row_index=int(row),
                column=outlier_col,
                anomaly_type="outlier",
                original_value=str(original),
                description=f"Value {df.at[row, outlier_col]} is outside the expected range"
            ))

    # pick first nullable column for missing
    nullable_col = df.columns[0] if len(df.columns) > 0 else None
    if nullable_col:
        for row in missing_rows:
            original = df.at[row, nullable_col]
            df.at[row, nullable_col] = None
            anomalies.append(AnomalyRecord(
                row_index=int(row),
                column=nullable_col,
                anomaly_type="missing",
                original_value=str(original),
                description=f"Missing value in column '{nullable_col}'"
            ))

    # duplicates
    for row in duplicate_rows:
        if row > 0:
            df.iloc[row] = df.iloc[row - 1].copy()
            anomalies.append(AnomalyRecord(
                row_index=int(row),
                column="*",
                anomaly_type="duplicate",
                original_value=None,
                description=f"Row is a duplicate of row {row - 1}"
            ))

    return df, anomalies


@router.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    # use schema if provided, otherwise generate default sensor dataset
    if request.schema:
        df = generate_schema_dataset(
            rows=request.rows,
            seed=request.seed,
            schema_fields=request.schema,
        )
        df_with_anomalies, anomaly_records = inject_schema_anomalies(
            df,
            anomaly_rate=request.anomaly_rate,
            seed=request.seed,
        )
    else:
        df = generate_clean_dataset(rows=request.rows, seed=request.seed)
        df_with_anomalies, anomaly_records = inject_anomalies(
            df,
            anomaly_rate=request.anomaly_rate,
            seed=request.seed,
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
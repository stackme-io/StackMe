import numpy as np
import pandas as pd
from .injectors import AnomalyRecord, INJECTORS


def generate_clean_dataset(rows: int, seed: int = 42) -> pd.DataFrame:
    """Generates a clean dataset without anomalies. Simulates sensor readings."""
    rng = np.random.default_rng(seed)

    df = pd.DataFrame({
        "id": range(1, rows + 1),
        "timestamp": pd.date_range(
            start="2024-01-01",
            periods=rows,
            freq="h"
        ).astype(str),
        "sensor_id": rng.choice(
            ["sensor_A", "sensor_B", "sensor_C"],
            size=rows
        ),
        "temperature": rng.normal(loc=22.0, scale=1.5, size=rows).round(2),
        "pressure": rng.normal(loc=101.3, scale=0.5, size=rows).round(2),
        "humidity": rng.uniform(low=40.0, high=60.0, size=rows).round(2),
        "user_id": rng.integers(low=1000, high=9999, size=rows),
    })

    return df


def inject_anomalies(
    df: pd.DataFrame,
    anomaly_rate: float = 0.05,
    seed: int = 42,
    anomaly_types: list[str] | None = None,
) -> tuple[pd.DataFrame, list[AnomalyRecord]]:
    """
    Injects anomalies into a dataset.
    anomaly_types: list matching UI checkbox ids.
    Falls back to ['outliers', 'nulls', 'duplicates'] if not provided.
    """
    rng = np.random.default_rng(seed)
    df = df.copy()
    anomalies: list[AnomalyRecord] = []

    active_types = [t for t in (anomaly_types or []) if t in INJECTORS]
    if not active_types:
        active_types = ["outliers", "nulls", "duplicates"]

    n_anomalies = max(1, int(len(df) * anomaly_rate))
    anomaly_rows = rng.choice(len(df), size=n_anomalies, replace=False).tolist()

    n_types = len(active_types)
    chunks: dict[str, list[int]] = {t: [] for t in active_types}
    for i, row in enumerate(anomaly_rows):
        atype = active_types[i % n_types]
        chunks[atype].append(row)

    for atype, rows in chunks.items():
        if rows:
            new_anomalies = INJECTORS[atype](df, rows, rng)
            anomalies.extend(new_anomalies)

    return df, anomalies


def serialize_dataset(df: pd.DataFrame, format: str) -> str:
    """Serializes dataset to the requested format."""
    if format == "json":
        return df.to_json(orient="records", force_ascii=False)

    if format == "csv":
        return df.to_csv(index=False)

    if format == "sql":
        table = "sensor_data"
        rows = []
        for _, row in df.iterrows():
            values = []
            for val in row:
                if val is None or (isinstance(val, float) and np.isnan(val)):
                    values.append("NULL")
                elif isinstance(val, (int, float)):
                    values.append(str(val))
                else:
                    escaped = str(val).replace("'", "''")
                    values.append(f"'{escaped}'")
            rows.append(f"({', '.join(values)})")

        columns = ", ".join(df.columns.tolist())
        inserts = ",\n  ".join(rows)
        return f"INSERT INTO {table} ({columns}) VALUES\n  {inserts};"

    raise ValueError(f"Unknown format: {format}")


def detect_anomalies(df: pd.DataFrame) -> list[AnomalyRecord]:
    """
    Detects anomalies in an uploaded dataset.
    Checks for: outliers (IQR), missing values, duplicate rows.
    """
    anomalies: list[AnomalyRecord] = []
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

    for col in numeric_cols:
        q1 = df[col].quantile(0.25)
        q3 = df[col].quantile(0.75)
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr

        outlier_mask = (df[col] < lower) | (df[col] > upper)
        for idx in df[outlier_mask].index.tolist():
            anomalies.append(AnomalyRecord(
                row_index=int(idx),
                column=col,
                anomaly_type="outlier",
                original_value=str(df.at[idx, col]),
                description=(
                    f"Value {df.at[idx, col]} is outside "
                    f"IQR range [{lower:.2f}, {upper:.2f}]"
                )
            ))

    for col in df.columns:
        missing_mask = df[col].isna()
        for idx in df[missing_mask].index.tolist():
            anomalies.append(AnomalyRecord(
                row_index=int(idx),
                column=col,
                anomaly_type="missing",
                original_value=None,
                description=f"Missing value in column '{col}'"
            ))

    duplicate_mask = df.duplicated(keep='first')
    for idx in df[duplicate_mask].index.tolist():
        anomalies.append(AnomalyRecord(
            row_index=int(idx),
            column="*",
            anomaly_type="duplicate",
            original_value=None,
            description=f"Row {idx} is a duplicate"
        ))

    return anomalies
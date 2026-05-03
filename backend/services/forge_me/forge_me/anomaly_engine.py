import numpy as np
import pandas as pd
from dataclasses import dataclass


@dataclass
class AnomalyRecord:
    row_index: int
    column: str
    anomaly_type: str  # "outlier" | "missing" | "duplicate"
    original_value: str | None
    description: str


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
) -> tuple[pd.DataFrame, list[AnomalyRecord]]:
    """Injects anomalies into a dataset. Returns modified dataset and anomaly list."""
    rng = np.random.default_rng(seed)
    df = df.copy()
    anomalies: list[AnomalyRecord] = []

    n_anomalies = max(1, int(len(df) * anomaly_rate))
    anomaly_rows = rng.choice(len(df), size=n_anomalies, replace=False)

    third = max(1, n_anomalies // 3)
    outlier_rows = anomaly_rows[:third]
    missing_rows = anomaly_rows[third:third * 2]
    duplicate_rows = anomaly_rows[third * 2:]

    for row in outlier_rows:
        original = df.at[row, "temperature"]
        df.at[row, "temperature"] = round(float(original) * 10, 2)
        anomalies.append(AnomalyRecord(
            row_index=int(row),
            column="temperature",
            anomaly_type="outlier",
            original_value=str(original),
            description=f"Value {df.at[row, 'temperature']} is outside the expected range"
        ))

    for row in missing_rows:
        original = df.at[row, "user_id"]
        df.at[row, "user_id"] = None
        anomalies.append(AnomalyRecord(
            row_index=int(row),
            column="user_id",
            anomaly_type="missing",
            original_value=str(original),
            description="Missing value in column 'user_id'"
        ))

    for row in duplicate_rows:
        if row > 0:
            original_id = df.at[row, "id"]
            df.iloc[row] = df.iloc[row - 1].copy()
            df.at[row, "id"] = original_id
            anomalies.append(AnomalyRecord(
                row_index=int(row),
                column="id",
                anomaly_type="duplicate",
                original_value=None,
                description=f"Row is a duplicate of row {row - 1}"
            ))

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
    Checks for: outliers (IQR method), missing values, duplicate rows.
    """
    anomalies: list[AnomalyRecord] = []
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

    # Outliers via IQR
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
                description=f"Value {df.at[idx, col]} is outside IQR range [{lower:.2f}, {upper:.2f}]"
            ))

    # Missing values
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

    # Duplicate rows
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
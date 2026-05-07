from dataclasses import dataclass
import pandas as pd
import numpy as np


@dataclass
class AnomalyRecord:
    row_index: int
    column: str
    anomaly_type: str
    original_value: str
    description: str


def detect_nulls(df: pd.DataFrame) -> list[AnomalyRecord]:
    records = []
    for col in df.columns:
        for idx in df.index[df[col].isna()]:
            records.append(AnomalyRecord(
                row_index=int(idx),
                column=col,
                anomaly_type='missing',
                original_value='',
                description=f'Null or empty value in column "{col}"',
            ))
    return records


def detect_duplicates(df: pd.DataFrame) -> list[AnomalyRecord]:
    records = []
    duplicated = df[df.duplicated(keep='first')]
    for idx in duplicated.index:
        records.append(AnomalyRecord(
            row_index=int(idx),
            column='*',
            anomaly_type='duplicate',
            original_value='',
            description='Duplicate row detected',
        ))
    return records


def detect_outliers(df: pd.DataFrame) -> list[AnomalyRecord]:
    records = []
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) < 4:
            continue
        q1  = series.quantile(0.25)
        q3  = series.quantile(0.75)
        iqr = q3 - q1
        if iqr == 0:
            continue
        lower = q1 - 3 * iqr
        upper = q3 + 3 * iqr
        outlier_mask = (df[col] < lower) | (df[col] > upper)
        for idx in df.index[outlier_mask & df[col].notna()]:
            val = df.at[idx, col]
            records.append(AnomalyRecord(
                row_index=int(idx),
                column=col,
                anomaly_type='outlier',
                original_value=str(val),
                description=f'Outlier detected in column "{col}" (value: {val}, expected range: {lower:.2f}–{upper:.2f})',
            ))
    return records


def detect_all(df: pd.DataFrame) -> list[AnomalyRecord]:
    records = []
    records.extend(detect_nulls(df))
    records.extend(detect_duplicates(df))
    records.extend(detect_outliers(df))
    records.sort(key=lambda r: r.row_index)
    return records
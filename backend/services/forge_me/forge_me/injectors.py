import numpy as np
import pandas as pd
from dataclasses import dataclass


@dataclass
class AnomalyRecord:
    row_index: int
    column: str
    anomaly_type: str
    original_value: str | None
    description: str


def _pick_numeric_col(df: pd.DataFrame) -> str | None:
    """Returns first float column, or first numeric column, or None."""
    float_cols = [c for c in df.columns if df[c].dtype == float]
    if float_cols:
        return float_cols[0]
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    return numeric_cols[0] if numeric_cols else None


def _pick_timestamp_col(df: pd.DataFrame) -> str | None:
    """Returns first column whose name contains 'time' or 'date', or None."""
    for col in df.columns:
        if "time" in col.lower() or "date" in col.lower():
            return col
    return None


def inject_subtle_outlier(
    df: pd.DataFrame,
    rows: list[int],
    rng: np.random.Generator,
) -> list[AnomalyRecord]:
    """Injects subtle outliers: ±3σ shift. Plausible visually, detectable by IQR."""
    anomalies = []
    col = _pick_numeric_col(df)
    if col is None:
        return anomalies

    mean = float(df[col].mean())
    std = float(df[col].std())

    for row in rows:
        original = df.at[row, col]
        direction = rng.choice([-1, 1])
        shift = std * (3.0 + float(rng.uniform(0.1, 0.5)))
        new_val = round(mean + direction * shift, 2)
        df.at[row, col] = new_val
        anomalies.append(AnomalyRecord(
            row_index=int(row),
            column=col,
            anomaly_type="outlier",
            original_value=str(original),
            description=(
                f"Value {new_val} is {abs(new_val - mean):.2f} away from mean "
                f"({mean:.2f}), exceeds 3σ ({std:.2f})"
            )
        ))

    return anomalies


def inject_missing(
    df: pd.DataFrame,
    rows: list[int],
    _rng: np.random.Generator,
) -> list[AnomalyRecord]:
    """Injects NULL values into a selected column."""
    anomalies = []
    nullable_cols = [c for c in df.columns if c not in ("id", "timestamp")]
    col = nullable_cols[0] if nullable_cols else df.columns[0]

    for row in rows:
        original = df.at[row, col]
        df.at[row, col] = None
        anomalies.append(AnomalyRecord(
            row_index=int(row),
            column=col,
            anomaly_type="missing",
            original_value=str(original),
            description=f"Missing value in column '{col}'"
        ))

    return anomalies


def inject_duplicates(
    df: pd.DataFrame,
    rows: list[int],
    _rng: np.random.Generator,
) -> list[AnomalyRecord]:
    """Copies previous row verbatim (preserves id if present)."""
    anomalies = []

    for row in rows:
        if row > 0:
            original_id = df.at[row, "id"] if "id" in df.columns else None
            df.iloc[row] = df.iloc[row - 1].copy()
            if original_id is not None:
                df.at[row, "id"] = original_id
            anomalies.append(AnomalyRecord(
                row_index=int(row),
                column="*",
                anomaly_type="duplicate",
                original_value=None,
                description=f"Row is a duplicate of row {row - 1}"
            ))

    return anomalies


def inject_type_mismatch(
    df: pd.DataFrame,
    rows: list[int],
    rng: np.random.Generator,
) -> list[AnomalyRecord]:
    """Inserts a string value into a numeric column."""
    anomalies = []
    col = _pick_numeric_col(df)
    if col is None:
        return anomalies

    bad_values = ["N/A", "ERROR", "null", "undefined", "NaN"]
    df[col] = df[col].astype(object)

    for row in rows:
        original = df.at[row, col]
        bad_val = bad_values[int(rng.integers(0, len(bad_values)))]
        df.at[row, col] = bad_val
        anomalies.append(AnomalyRecord(
            row_index=int(row),
            column=col,
            anomaly_type="type_mismatch",
            original_value=str(original),
            description=f"String value '{bad_val}' in numeric column '{col}'"
        ))

    return anomalies


def inject_stale_timestamp(
    df: pd.DataFrame,
    rows: list[int],
    rng: np.random.Generator,
) -> list[AnomalyRecord]:
    """Shifts timestamp backward by 7–30 days."""
    anomalies = []
    col = _pick_timestamp_col(df)
    if col is None:
        return anomalies

    for row in rows:
        original = df.at[row, col]
        try:
            ts = pd.Timestamp(str(original))
            days_back = int(rng.integers(7, 31))
            new_ts = str(ts - pd.Timedelta(days=days_back))
            df.at[row, col] = new_ts
            anomalies.append(AnomalyRecord(
                row_index=int(row),
                column=col,
                anomaly_type="stale_timestamp",
                original_value=str(original),
                description=(
                    f"Timestamp is {days_back} days in the past "
                    f"relative to surrounding rows"
                )
            ))
        except (ValueError, TypeError) as e:
            continue

    return anomalies


def inject_out_of_order(
    df: pd.DataFrame,
    rows: list[int],
    _rng: np.random.Generator,
) -> list[AnomalyRecord]:
    """Swaps timestamps between adjacent rows to break chronological order."""
    anomalies = []
    col = _pick_timestamp_col(df)
    if col is None:
        return anomalies

    for row in rows:
        if row + 1 < len(df):
            ts_curr = df.at[row, col]
            ts_next = df.at[row + 1, col]
            df.at[row, col] = ts_next
            df.at[row + 1, col] = ts_curr
            anomalies.append(AnomalyRecord(
                row_index=int(row),
                column=col,
                anomaly_type="out_of_order",
                original_value=str(ts_curr),
                description=(
                    f"Timestamp swapped with row {row + 1} — "
                    f"event arrived out of chronological order"
                )
            ))

    return anomalies


def inject_late_arrival(
    df: pd.DataFrame,
    rows: list[int],
    rng: np.random.Generator,
) -> list[AnomalyRecord]:
    """Assigns stale timestamps to selected rows to simulate late-arriving events."""
    anomalies = []
    col = _pick_timestamp_col(df)
    if col is None:
        return anomalies

    try:
        last_ts = pd.Timestamp(str(df[col].iloc[-1]))
    except (ValueError, TypeError):
        return anomalies

    for row in rows:
        original_ts = df.at[row, col]
        days_back = int(rng.integers(7, 31))
        stale_ts = str(last_ts - pd.Timedelta(days=days_back))
        df.at[row, col] = stale_ts
        anomalies.append(AnomalyRecord(
            row_index=int(row),
            column=col,
            anomaly_type="late_arrival",
            original_value=str(original_ts),
            description=(
                f"Event arrived late — timestamp is {days_back} days "
                f"behind the stream tail"
            )
        ))

    return anomalies


INJECTORS: dict[str, callable] = {
    "nulls":            inject_missing,
    "duplicates":       inject_duplicates,
    "outliers":         inject_subtle_outlier,
    "out-of-order":     inject_out_of_order,
    "late-arrivals":    inject_late_arrival,
    "type-mismatches":  inject_type_mismatch,
    "stale-timestamps": inject_stale_timestamp,
}
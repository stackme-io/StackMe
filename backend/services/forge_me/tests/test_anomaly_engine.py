import pytest
import numpy as np
import pandas as pd
from forge_me.anomaly_engine import generate_clean_dataset, inject_anomalies, detect_anomalies
from forge_me.injectors import (
    inject_subtle_outlier, inject_missing, inject_duplicates,
    inject_type_mismatch, inject_stale_timestamp,
    inject_out_of_order, inject_late_arrival,
)


# ── generate_clean_dataset ──────────────────────────────────────────────────

def test_generate_clean_dataset_shape():
    df = generate_clean_dataset(rows=100)
    assert len(df) == 100
    assert len(df.columns) == 7


def test_generate_clean_dataset_no_nulls():
    df = generate_clean_dataset(rows=100)
    assert df.isnull().sum().sum() == 0


def test_generate_clean_dataset_columns():
    df = generate_clean_dataset(rows=100)
    expected = {"id", "timestamp", "sensor_id", "temperature", "pressure", "humidity", "user_id"}
    assert set(df.columns) == expected


def test_generate_clean_dataset_temperature_range():
    df = generate_clean_dataset(rows=1000)
    assert df["temperature"].between(15.0, 30.0).all()


def test_generate_clean_dataset_reproducible():
    df1 = generate_clean_dataset(rows=50, seed=42)
    df2 = generate_clean_dataset(rows=50, seed=42)
    pd.testing.assert_frame_equal(df1, df2)


# ── inject_anomalies (orchestrator) ────────────────────────────────────────

def test_inject_anomalies_returns_correct_count():
    df = generate_clean_dataset(rows=100)
    _, anomalies = inject_anomalies(df, anomaly_rate=0.1)
    assert len(anomalies) == 10


def test_inject_anomalies_has_all_types():
    df = generate_clean_dataset(rows=100)
    _, anomalies = inject_anomalies(df, anomaly_rate=0.3)
    types = {a.anomaly_type for a in anomalies}
    assert "outlier" in types
    assert "missing" in types
    assert "duplicate" in types


def test_inject_anomalies_preserves_row_count():
    df = generate_clean_dataset(rows=100)
    df_anomaly, _ = inject_anomalies(df, anomaly_rate=0.1)
    assert len(df_anomaly) == 100


def test_inject_anomalies_respects_anomaly_types():
    """Only requested anomaly types appear in result."""
    df = generate_clean_dataset(rows=100)
    _, anomalies = inject_anomalies(
        df, anomaly_rate=0.2, anomaly_types=["nulls", "duplicates"]
    )
    types = {a.anomaly_type for a in anomalies}
    assert "outlier" not in types
    assert types.issubset({"missing", "duplicate"})


def test_inject_anomalies_fallback_types():
    """Falls back to default 3 types when anomaly_types is empty."""
    df = generate_clean_dataset(rows=100)
    _, anomalies = inject_anomalies(df, anomaly_rate=0.3, anomaly_types=[])
    types = {a.anomaly_type for a in anomalies}
    assert types.issubset({"outlier", "missing", "duplicate"})


# ── inject_subtle_outlier ───────────────────────────────────────────────────

def test_subtle_outlier_is_detectable_by_iqr():
    """Subtle outlier exceeds 3σ and should be caught by IQR detection."""
    df = generate_clean_dataset(rows=200, seed=1)
    rng = np.random.default_rng(1)
    df_copy = df.copy()
    inject_subtle_outlier(df_copy, [10, 20, 30], rng)
    anomalies = detect_anomalies(df_copy)
    outliers = [a for a in anomalies if a.anomaly_type == "outlier"]
    assert len(outliers) >= 1


def test_subtle_outlier_looks_plausible():
    """Subtle outlier should not be ×10 of original — must stay in believable range."""
    df = generate_clean_dataset(rows=100, seed=42)
    rng = np.random.default_rng(42)
    df_copy = df.copy()
    original = float(df_copy.at[10, "temperature"])
    inject_subtle_outlier(df_copy, [10], rng)
    new_val = float(df_copy.at[10, "temperature"])
    assert abs(new_val) < abs(original * 5), "Outlier should not be a gross ×10 spike"


# ── inject_missing ──────────────────────────────────────────────────────────

def test_inject_missing_creates_null():
    df = generate_clean_dataset(rows=100)
    rng = np.random.default_rng(42)
    df_copy = df.copy()
    anomalies = inject_missing(df_copy, [5, 10, 15], rng)
    assert len(anomalies) == 3
    for a in anomalies:
        assert pd.isna(df_copy.at[a.row_index, a.column])


def test_inject_missing_anomaly_type():
    df = generate_clean_dataset(rows=100)
    rng = np.random.default_rng(42)
    anomalies = inject_missing(df.copy(), [0], rng)
    assert anomalies[0].anomaly_type == "missing"


# ── inject_duplicates ───────────────────────────────────────────────────────

def test_inject_duplicates_copies_previous_row():
    df = generate_clean_dataset(rows=100)
    rng = np.random.default_rng(42)
    df_copy = df.copy()
    anomalies = inject_duplicates(df_copy, [10], rng)
    assert len(anomalies) == 1
    assert anomalies[0].anomaly_type == "duplicate"
    # all columns except id should match previous row
    for col in df_copy.columns:
        if col == "id":
            continue
        assert df_copy.at[10, col] == df_copy.at[9, col]


# ── inject_type_mismatch ────────────────────────────────────────────────────

def test_inject_type_mismatch_inserts_string():
    df = generate_clean_dataset(rows=100)
    rng = np.random.default_rng(42)
    df_copy = df.copy()
    anomalies = inject_type_mismatch(df_copy, [5, 10], rng)
    assert len(anomalies) == 2
    for a in anomalies:
        val = df_copy.at[a.row_index, a.column]
        assert isinstance(val, str), f"Expected string, got {type(val)}"
    assert all(a.anomaly_type == "type_mismatch" for a in anomalies)


# ── inject_stale_timestamp ──────────────────────────────────────────────────

def test_inject_stale_timestamp_shifts_backward():
    df = generate_clean_dataset(rows=100)
    rng = np.random.default_rng(42)
    df_copy = df.copy()
    original_ts = pd.Timestamp(df_copy.at[5, "timestamp"])
    anomalies = inject_stale_timestamp(df_copy, [5], rng)
    assert len(anomalies) == 1
    new_ts = pd.Timestamp(df_copy.at[5, "timestamp"])
    assert new_ts < original_ts
    assert anomalies[0].anomaly_type == "stale_timestamp"


# ── inject_out_of_order ─────────────────────────────────────────────────────

def test_inject_out_of_order_swaps_timestamps():
    df = generate_clean_dataset(rows=100)
    rng = np.random.default_rng(42)
    df_copy = df.copy()
    ts_row5 = df_copy.at[5, "timestamp"]
    ts_row6 = df_copy.at[6, "timestamp"]
    anomalies = inject_out_of_order(df_copy, [5], rng)
    assert len(anomalies) == 1
    assert df_copy.at[5, "timestamp"] == ts_row6
    assert df_copy.at[6, "timestamp"] == ts_row5
    assert anomalies[0].anomaly_type == "out_of_order"


# ── inject_late_arrival ─────────────────────────────────────────────────────

def test_inject_late_arrival_assigns_stale_timestamp():
    df = generate_clean_dataset(rows=100)
    rng = np.random.default_rng(42)
    df_copy = df.copy()
    last_ts = pd.Timestamp(df_copy["timestamp"].iloc[-1])
    anomalies = inject_late_arrival(df_copy, [10], rng)
    assert len(anomalies) == 1
    new_ts = pd.Timestamp(df_copy.at[10, "timestamp"])
    assert new_ts < last_ts
    assert anomalies[0].anomaly_type == "late_arrival"


# ── detect_anomalies ────────────────────────────────────────────────────────

def test_detect_anomalies_finds_outlier():
    df = pd.DataFrame({
        "temperature": [22.0, 21.5, 23.0, 22.8, 999.0],
        "pressure": [101.0, 101.1, 101.2, 101.3, 101.4],
    })
    anomalies = detect_anomalies(df)
    outliers = [a for a in anomalies if a.anomaly_type == "outlier"]
    assert len(outliers) >= 1
    assert any(a.column == "temperature" and "999" in a.original_value for a in outliers)


def test_detect_anomalies_finds_missing():
    df = pd.DataFrame({
        "temperature": [22.0, None, 23.0],
        "user_id": [1001, 1002, None],
    })
    anomalies = detect_anomalies(df)
    missing = [a for a in anomalies if a.anomaly_type == "missing"]
    assert len(missing) == 2
    columns = {a.column for a in missing}
    assert "temperature" in columns
    assert "user_id" in columns


def test_detect_anomalies_finds_duplicates():
    df = pd.DataFrame({
        "temperature": [22.0, 22.0, 23.0],
        "pressure": [101.0, 101.0, 101.5],
    })
    anomalies = detect_anomalies(df)
    duplicates = [a for a in anomalies if a.anomaly_type == "duplicate"]
    assert len(duplicates) == 1
    assert duplicates[0].row_index == 1


def test_detect_anomalies_clean_dataset():
    df = generate_clean_dataset(rows=100)
    anomalies = detect_anomalies(df)
    missing = [a for a in anomalies if a.anomaly_type == "missing"]
    duplicates = [a for a in anomalies if a.anomaly_type == "duplicate"]
    assert len(missing) == 0
    assert len(duplicates) == 0


def test_detect_anomalies_returns_anomaly_records():
    df = pd.DataFrame({
        "temperature": [22.0, 999.0],
        "pressure": [101.0, 101.1],
    })
    anomalies = detect_anomalies(df)
    assert all(hasattr(a, "row_index") for a in anomalies)
    assert all(hasattr(a, "column") for a in anomalies)
    assert all(hasattr(a, "anomaly_type") for a in anomalies)
    assert all(hasattr(a, "description") for a in anomalies)
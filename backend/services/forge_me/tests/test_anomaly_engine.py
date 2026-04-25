import pytest
import pandas as pd
from forge_me.anomaly_engine import generate_clean_dataset, inject_anomalies


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


def test_inject_anomalies_returns_correct_count():
    """Количество аномалий соответствует anomaly_rate"""
    df = generate_clean_dataset(rows=100)
    _, anomalies = inject_anomalies(df, anomaly_rate=0.1)
    assert len(anomalies) == 10


def test_inject_anomalies_has_all_types():
    """Все три типа аномалий присутствуют"""
    df = generate_clean_dataset(rows=100)
    _, anomalies = inject_anomalies(df, anomaly_rate=0.3)
    types = {a.anomaly_type for a in anomalies}
    assert "outlier" in types
    assert "missing" in types
    assert "duplicate" in types


def test_inject_anomalies_outlier_value():
    """Выброс температуры в 10x от оригинала"""
    df = generate_clean_dataset(rows=100)
    df_anomaly, anomalies = inject_anomalies(df, anomaly_rate=0.1)
    outliers = [a for a in anomalies if a.anomaly_type == "outlier"]
    for a in outliers:
        original = float(a.original_value)
        new_value = df_anomaly.at[a.row_index, "temperature"]
        assert abs(new_value - original * 10) < 0.01


def test_inject_anomalies_missing_value():
    """Пропуск user_id реально None в датасете"""
    df = generate_clean_dataset(rows=100)
    df_anomaly, anomalies = inject_anomalies(df, anomaly_rate=0.1)
    missing = [a for a in anomalies if a.anomaly_type == "missing"]
    for a in missing:
        assert pd.isna(df_anomaly.at[a.row_index, "user_id"])


def test_inject_anomalies_preserves_row_count():
    """Количество строк не меняется после внедрения аномалий"""
    df = generate_clean_dataset(rows=100)
    df_anomaly, _ = inject_anomalies(df, anomaly_rate=0.1)
    assert len(df_anomaly) == 100
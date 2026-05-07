import pandas as pd
import numpy as np
import pytest
from analyze_me.detectors import detect_nulls, detect_duplicates, detect_outliers, detect_all


# ── detect_nulls ────────────────────────────────────────────────────────────

def test_detect_nulls_finds_missing():
    df = pd.DataFrame({
        'temperature': [22.5, None, 23.1],
        'pressure':    [101.0, 101.1, None],
    })
    records = detect_nulls(df)
    assert len(records) == 2
    types = {r.anomaly_type for r in records}
    assert types == {'missing'}


def test_detect_nulls_clean_dataset():
    df = pd.DataFrame({
        'temperature': [22.5, 23.1, 21.8],
        'pressure':    [101.0, 101.1, 101.2],
    })
    assert detect_nulls(df) == []


def test_detect_nulls_correct_row_index():
    df = pd.DataFrame({'value': [1.0, None, 3.0, None]})
    records = detect_nulls(df)
    assert [r.row_index for r in records] == [1, 3]


def test_detect_nulls_correct_column():
    df = pd.DataFrame({'a': [None], 'b': [1.0]})
    records = detect_nulls(df)
    assert len(records) == 1
    assert records[0].column == 'a'


# ── detect_duplicates ───────────────────────────────────────────────────────

def test_detect_duplicates_finds_duplicate():
    df = pd.DataFrame({
        'temperature': [22.5, 23.1, 22.5],
        'pressure':    [101.0, 101.1, 101.0],
    })
    records = detect_duplicates(df)
    assert len(records) == 1
    assert records[0].row_index == 2
    assert records[0].anomaly_type == 'duplicate'


def test_detect_duplicates_keeps_first():
    df = pd.DataFrame({'val': [1, 1, 1]})
    records = detect_duplicates(df)
    indices = [r.row_index for r in records]
    assert 0 not in indices
    assert 1 in indices
    assert 2 in indices


def test_detect_duplicates_clean_dataset():
    df = pd.DataFrame({'val': [1, 2, 3]})
    assert detect_duplicates(df) == []


# ── detect_outliers ─────────────────────────────────────────────────────────

def test_detect_outliers_finds_outlier():
    df = pd.DataFrame({'temperature': [22.0, 21.5, 23.0, 22.8, 999.0]})
    records = detect_outliers(df)
    assert len(records) == 1
    assert records[0].row_index == 4
    assert records[0].anomaly_type == 'outlier'
    assert '999' in records[0].original_value


def test_detect_outliers_clean_dataset():
    df = pd.DataFrame({'temperature': [22.0, 21.5, 23.0, 22.8, 22.1]})
    assert detect_outliers(df) == []


def test_detect_outliers_skips_non_numeric():
    df = pd.DataFrame({'name': ['alice', 'bob', 'charlie']})
    assert detect_outliers(df) == []


def test_detect_outliers_skips_zero_iqr():
    df = pd.DataFrame({'val': [5.0, 5.0, 5.0, 5.0, 5.0]})
    assert detect_outliers(df) == []


# ── detect_all ──────────────────────────────────────────────────────────────

def test_detect_all_sorted_by_row_index():
    df = pd.DataFrame({
        'temperature': [999.0, None, 22.0, 22.0],
        'pressure':    [101.0, 101.1, 101.2, 101.2],
    })
    records = detect_all(df)
    indices = [r.row_index for r in records]
    assert indices == sorted(indices)


def test_detect_all_finds_all_types():
    df = pd.DataFrame({
        'temperature': [22.0, None, 22.0, 21.5, 23.1, 22.8, 21.9, 22.3, 999.0],
        'pressure':    [101.0, 101.1, 101.0, 101.2, 101.3, 101.1, 101.2, 101.0, 101.4],
    })
    records = detect_all(df)
    types = {r.anomaly_type for r in records}
    assert 'missing' in types
    assert 'duplicate' in types
    assert 'outlier' in types
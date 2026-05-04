from enum import Enum
from pydantic import BaseModel, Field


class DataFormat(str, Enum):
    json = "json"
    csv = "csv"
    sql = "sql"


class AnomalyType(str, Enum):
    outlier = "outlier"
    missing = "missing"
    duplicate = "duplicate"
    type_mismatch = "type_mismatch"
    stale_timestamp = "stale_timestamp"
    out_of_order = "out_of_order"
    late_arrival = "late_arrival"


class SchemaField(BaseModel):
    name: str
    type: str  # "int" | "float" | "timestamp" | "string"


class GenerateRequest(BaseModel):
    prompt: str = Field(
        default="",
        description="Dataset description"
    )
    format: DataFormat = Field(
        default=DataFormat.json,
        description="Output format"
    )
    rows: int = Field(
        default=100,
        ge=10,
        le=10000,
        description="Number of rows"
    )
    anomaly_rate: float = Field(
        default=0.05,
        ge=0.0,
        le=0.5,
        description="Fraction of anomalous rows"
    )
    seed: int = Field(
        default=42,
        description="Random seed for reproducibility"
    )
    schema: list[SchemaField] | None = Field(
        default=None,
        description="User schema fields for Schema match mode"
    )
    anomaly_types: list[str] | None = Field(
        default=None,
        description="Anomaly types to inject, matching UI checkbox ids"
    )


class AnomalyInfo(BaseModel):
    row_index: int
    column: str
    anomaly_type: AnomalyType
    original_value: str | None
    description: str


class GenerateResponse(BaseModel):
    format: DataFormat
    rows_total: int
    anomalies_count: int
    anomalies: list[AnomalyInfo]
    data: str


class AnalyzeResponse(BaseModel):
    rows_total: int
    anomalies_count: int
    anomalies: list[AnomalyInfo]
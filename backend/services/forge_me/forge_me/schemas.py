from enum import Enum
from pydantic import BaseModel, Field


class DataFormat(str, Enum):
    json = "json"
    csv = "csv"
    sql = "sql"


class AnomalyType(str, Enum):
    outlier = "outlier"       # числовой выброс
    missing = "missing"       # пропущенное значение
    duplicate = "duplicate"   # дублирующаяся строка


class GenerateRequest(BaseModel):
    prompt: str = Field(
        min_length=10,
        description="Описание датасета который нужно сгенерировать"
    )
    format: DataFormat = Field(
        default=DataFormat.json,
        description="Формат возвращаемых данных"
    )
    rows: int = Field(
        default=100,
        ge=10,
        le=10000,
        description="Количество строк в датасете"
    )
    anomaly_rate: float = Field(
        default=0.05,
        ge=0.0,
        le=0.5,
        description="Доля аномальных строк (0.05 = 5%)"
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
    data: str  # сами данные в виде строки (JSON, CSV или SQL)
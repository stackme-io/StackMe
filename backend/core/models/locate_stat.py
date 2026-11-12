from sqlalchemy import String, Text, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column
from core.db import Base


class LocateStat(Base):
    """One voluntarily shared, anonymous LocateMe result.

    Deliberately minimal: no user id, no IP, no exact timestamp (month only), no code,
    no paths, no project names. Rows are never returned individually - only aggregates.
    """
    __tablename__ = "locate_stats"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    month: Mapped[str] = mapped_column(String(7), nullable=False)  # "2026-11"
    schema: Mapped[int] = mapped_column(Integer, nullable=False)
    rules: Mapped[str] = mapped_column(String(16), nullable=False)
    framework: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    size: Mapped[str] = mapped_column(String(16), nullable=False)
    age: Mapped[str | None] = mapped_column(String(8), nullable=True)
    # Rounded counts as JSON ("<5" kept as a string), exactly as the user saw them.
    kinds: Mapped[str] = mapped_column(Text, nullable=False)
    sub: Mapped[str] = mapped_column(Text, nullable=False)
    # Derived on the server from `kinds` so aggregates don't re-parse JSON.
    fragile_share: Mapped[float] = mapped_column(Float, nullable=False)
    # sha256 of the canonical row: identical rows are almost surely the same suite.
    fingerprint: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)

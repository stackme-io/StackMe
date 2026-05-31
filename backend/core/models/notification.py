from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from core.db import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # null = broadcast (visible to everyone)
    user_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    # suggestion_published | new_version | survey | announcement
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class NotificationRead(Base):
    __tablename__ = "notification_reads"
    __table_args__ = (UniqueConstraint("user_id", "notification_id", name="uq_notification_read"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    notification_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False
    )

from datetime import datetime
from sqlalchemy import String, Text, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from core.db import Base


class ContactMessage(Base):
    """Private inbox for the 'Contact the team' form. Not a public board:
    no votes, no publish flag. Written without auth (optional user_id if the
    sender happened to be signed in)."""

    __tablename__ = "contact_messages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category: Mapped[str | None] = mapped_column(String(30), nullable=True)
    user_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    handled: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

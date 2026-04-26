from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from core.db import Base


class UserModule(Base):
    __tablename__ = "user_modules"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    module_id: Mapped[str] = mapped_column(String(100), nullable=False)
    activated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
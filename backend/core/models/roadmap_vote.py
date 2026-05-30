from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from core.db import Base


class RoadmapVote(Base):
    __tablename__ = "roadmap_votes"
    __table_args__ = (UniqueConstraint("user_id", "module_id", "item_key", name="uq_roadmap_vote"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    module_id: Mapped[str] = mapped_column(String(50), nullable=False)
    item_key: Mapped[str] = mapped_column(String(100), nullable=False)

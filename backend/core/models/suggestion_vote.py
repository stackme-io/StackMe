from sqlalchemy import String, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from core.db import Base


class SuggestionVote(Base):
    __tablename__ = "suggestion_votes"
    __table_args__ = (UniqueConstraint("user_id", "suggestion_id", name="uq_suggestion_vote"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    suggestion_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("suggestions.id", ondelete="CASCADE"), nullable=False, index=True
    )

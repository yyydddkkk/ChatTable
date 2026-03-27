from datetime import datetime
from typing import Optional

from sqlalchemy import Index
from sqlmodel import Field, SQLModel


class AgentMemoryEntry(SQLModel, table=True):
    __tablename__ = "agent_memory_entries"
    __table_args__ = (
        Index(
            "ix_agent_memory_entries_tenant_agent_conversation",
            "tenant_id",
            "agent_id",
            "conversation_id",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: str = Field(default="local", index=True, max_length=100)
    agent_id: int = Field(foreign_key="agents.id", index=True)
    conversation_id: int = Field(foreign_key="conversations.id", index=True)
    memory_type: str = Field(max_length=100)
    content: str
    importance_score: float = Field(default=0.0)
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

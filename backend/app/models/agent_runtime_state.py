from datetime import datetime
from typing import Optional

from sqlalchemy import Index
from sqlmodel import Field, SQLModel


class AgentRuntimeState(SQLModel, table=True):
    __tablename__ = "agent_runtime_states"
    __table_args__ = (
        Index("ix_agent_runtime_states_tenant_agent", "tenant_id", "agent_id"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: str = Field(default="local", index=True, max_length=100)
    agent_id: int = Field(foreign_key="agents.id", index=True)
    mood: str = Field(default="neutral", max_length=50)
    activity_level: float = Field(default=0.0)
    relationship_strength: float = Field(default=0.0)
    attention_topics_json: str = Field(default="[]")
    cooldown_until: datetime | None = Field(default=None)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

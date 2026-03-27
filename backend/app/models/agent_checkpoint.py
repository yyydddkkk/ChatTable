from datetime import datetime
from typing import Optional

from sqlalchemy import Index
from sqlmodel import Field, SQLModel


class AgentCheckpoint(SQLModel, table=True):
    __tablename__ = "agent_checkpoints"
    __table_args__ = (
        Index("ix_agent_checkpoints_tenant_agent", "tenant_id", "agent_id"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: str = Field(default="local", index=True, max_length=100)
    agent_id: int = Field(foreign_key="agents.id", index=True)
    checkpoint_key: str = Field(index=True, max_length=255)
    state_json: str = Field(default="{}")
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

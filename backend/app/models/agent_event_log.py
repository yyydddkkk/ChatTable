from datetime import datetime
from typing import Optional

from sqlalchemy import Index
from sqlmodel import Field, SQLModel


class AgentEventLog(SQLModel, table=True):
    __tablename__ = "agent_event_logs"
    __table_args__ = (
        Index(
            "ix_agent_event_logs_tenant_agent_created",
            "tenant_id",
            "agent_id",
            "created_at",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: str = Field(default="local", index=True, max_length=100)
    agent_id: int = Field(foreign_key="agents.id", index=True)
    conversation_id: int = Field(foreign_key="conversations.id", index=True)
    event_id: str = Field(index=True, max_length=255)
    event_type: str = Field(max_length=100)
    payload_json: str = Field(default="{}")
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

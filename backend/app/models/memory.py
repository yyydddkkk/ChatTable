from typing import Optional
from datetime import datetime
from sqlalchemy import Index
from sqlmodel import SQLModel, Field


class ConversationMemory(SQLModel, table=True):
    __tablename__ = "conversation_memories"
    __table_args__ = (
        Index(
            "ix_conversation_memories_tenant_conv_agent",
            "tenant_id",
            "conversation_id",
            "agent_id",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: str = Field(default="local", index=True, max_length=100)
    conversation_id: int = Field(foreign_key="conversations.id")
    agent_id: int = Field(foreign_key="agents.id")
    messages: str = Field(default="[]")
    summary: str = Field(default="")
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class ConversationMemory(SQLModel, table=True):
    __tablename__ = "conversation_memories"

    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="conversations.id")
    agent_id: int = Field(foreign_key="agents.id")
    messages: str = Field(default="[]")
    summary: str = Field(default="")
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

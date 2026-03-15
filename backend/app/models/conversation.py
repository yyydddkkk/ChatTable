from typing import Optional
from datetime import datetime
from sqlalchemy import Index
from sqlmodel import SQLModel, Field


class Conversation(SQLModel, table=True):
    __tablename__ = "conversations"
    __table_args__ = (
        Index("ix_conversations_tenant_type_created", "tenant_id", "type", "created_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: str = Field(default="local", index=True, max_length=100)
    type: str = Field(default="private", description="Conversation type: private/group")
    name: str = Field(max_length=200, description="Conversation name")
    members: str = Field(description="JSON string of agent IDs")
    last_message_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

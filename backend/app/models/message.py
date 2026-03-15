from typing import Optional
from datetime import datetime
from sqlalchemy import Index
from sqlmodel import SQLModel, Field


class Message(SQLModel, table=True):
    __tablename__ = "messages"
    __table_args__ = (
        Index(
            "ix_messages_tenant_conversation_created",
            "tenant_id",
            "conversation_id",
            "created_at",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: str = Field(default="local", index=True, max_length=100)
    conversation_id: int = Field(foreign_key="conversations.id")
    sender_type: str = Field(description="Sender type: user/agent")
    sender_id: Optional[int] = Field(
        default=None, description="Agent ID if sender is agent"
    )
    content: str = Field(description="Message content")
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

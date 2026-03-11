from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class Message(SQLModel, table=True):
    """Message data model"""

    __tablename__ = "messages"

    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="conversations.id")
    sender_type: str = Field(description="Sender type: user/agent")
    sender_id: Optional[int] = Field(default=None, description="Agent ID if sender is agent")
    content: str = Field(description="Message content")
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True


class MessageCreate(SQLModel):
    """Schema for creating a message"""

    conversation_id: int
    sender_type: str
    sender_id: Optional[int] = None
    content: str


class MessageResponse(SQLModel):
    """Schema for message response"""

    id: int
    conversation_id: int
    sender_type: str
    sender_id: Optional[int]
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

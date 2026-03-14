from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class MessageBase(BaseModel):
    conversation_id: int = Field(foreign_key="conversations.id")
    sender_type: str = Field(description="Sender type: user/agent")
    sender_id: Optional[int] = Field(
        default=None, description="Agent ID if sender is agent"
    )
    content: str = Field(description="Message content")


class MessageCreate(MessageBase):
    pass


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_type: str
    sender_id: Optional[int]
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

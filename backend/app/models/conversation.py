from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class Conversation(SQLModel, table=True):
    """Conversation data model"""

    __tablename__ = "conversations"

    id: Optional[int] = Field(default=None, primary_key=True)
    type: str = Field(default="private", description="Conversation type: private/group")
    name: str = Field(max_length=200, description="Conversation name")
    members: str = Field(description="JSON string of agent IDs")
    last_message_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True


class ConversationCreate(SQLModel):
    """Schema for creating a conversation"""

    type: str = "private"
    name: str
    members: str


class ConversationResponse(SQLModel):
    """Schema for conversation response"""

    id: int
    type: str
    name: str
    members: str
    last_message_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

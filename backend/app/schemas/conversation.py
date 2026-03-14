from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ConversationBase(BaseModel):
    type: str = Field(default="private", description="Conversation type: private/group")
    name: str = Field(max_length=200, description="Conversation name")
    members: str = Field(description="JSON string of agent IDs")


class ConversationCreate(ConversationBase):
    pass


class ConversationResponse(BaseModel):
    id: int
    type: str
    name: str
    members: str
    last_message_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

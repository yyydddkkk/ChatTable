from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class AutogenCheckpoint(SQLModel, table=True):
    __tablename__ = "autogen_checkpoints"

    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="conversations.id", unique=True, index=True)
    agent_signature: str = Field(description="Sorted agent-id signature for state compatibility")
    state_json: str = Field(description="Serialized team state")
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

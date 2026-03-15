from datetime import datetime
from typing import Optional

from sqlalchemy import Index
from sqlmodel import Field, SQLModel


class AutogenCheckpoint(SQLModel, table=True):
    __tablename__ = "autogen_checkpoints"
    __table_args__ = (
        Index(
            "ix_autogen_checkpoints_tenant_updated",
            "tenant_id",
            "updated_at",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: str = Field(default="local", index=True, max_length=100)
    conversation_id: int = Field(foreign_key="conversations.id", unique=True, index=True)
    agent_signature: str = Field(description="Sorted agent-id signature for state compatibility")
    state_json: str = Field(description="Serialized team state")
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

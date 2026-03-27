from datetime import datetime
from typing import Optional

from sqlalchemy import Index
from sqlmodel import Field, SQLModel


class AgentRelationshipState(SQLModel, table=True):
    __tablename__ = "agent_relationship_states"
    __table_args__ = (
        Index(
            "ix_agent_relationship_states_tenant_agent_user",
            "tenant_id",
            "agent_id",
            "user_id",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: str = Field(default="local", index=True, max_length=100)
    agent_id: int = Field(foreign_key="agents.id", index=True)
    user_id: int = Field(index=True)
    affinity_score: float = Field(default=0.0)
    trust_score: float = Field(default=0.0)
    summary: str = Field(default="")
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

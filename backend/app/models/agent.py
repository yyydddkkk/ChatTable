from typing import Optional
from datetime import datetime
from sqlalchemy import Index
from sqlmodel import SQLModel, Field


class Agent(SQLModel, table=True):
    __tablename__ = "agents"
    __table_args__ = (
        Index("ix_agents_tenant_active", "tenant_id", "is_active"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: str = Field(default="local", index=True, max_length=100)
    name: str = Field(max_length=100, description="Agent display name")
    avatar: Optional[str] = Field(default=None, description="Avatar URL or emoji")
    description: Optional[str] = Field(default=None, description="Agent description")
    model: str = Field(default="gpt-4o", description="LLM model name")
    provider_id: Optional[int] = Field(default=None, description="FK to Provider")
    system_prompt: str = Field(
        default="You are a helpful AI assistant.", description="System prompt"
    )
    response_speed: float = Field(
        default=1.0, description="Response speed multiplier (0.5-2.0)"
    )
    reply_probability: float = Field(
        default=0.8, description="Probability of replying (0-1)"
    )
    default_length: int = Field(
        default=3, ge=1, le=5, description="Default response length level"
    )
    is_active: bool = Field(default=True, description="Whether agent is active")
    personality: Optional[str] = Field(default=None, description="性格特征")
    background: Optional[str] = Field(default=None, description="背景故事")
    skills: Optional[str] = Field(
        default=None, description="技能列表，JSON array string"
    )
    tags: Optional[str] = Field(
        default=None, description="标签，JSON array string"
    )
    is_public: bool = Field(
        default=False, description="Whether agent is publicly visible"
    )
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

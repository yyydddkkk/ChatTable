from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class AgentBase(BaseModel):
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
    personality: Optional[str] = Field(default=None, description="性格特征")
    background: Optional[str] = Field(default=None, description="背景故事")
    skills: Optional[str] = Field(default=None, description="技能列表，JSON array string")
    tags: Optional[str] = Field(default=None, description="标签，JSON array string")
    is_public: bool = Field(
        default=False, description="Whether agent is publicly visible"
    )


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None
    description: Optional[str] = None
    model: Optional[str] = None
    provider_id: Optional[int] = None
    system_prompt: Optional[str] = None
    personality: Optional[str] = None
    background: Optional[str] = None
    skills: Optional[str] = None
    tags: Optional[str] = None
    response_speed: Optional[float] = None
    reply_probability: Optional[float] = None
    default_length: Optional[int] = Field(default=None, ge=1, le=5)
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None


class AgentResponse(BaseModel):
    id: int
    name: str
    avatar: Optional[str]
    description: Optional[str]
    model: str
    provider_id: Optional[int]
    system_prompt: str
    personality: Optional[str]
    background: Optional[str]
    skills: Optional[str]
    tags: Optional[str]
    response_speed: float
    reply_probability: float
    default_length: int
    is_active: bool
    is_public: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

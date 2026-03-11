from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class Agent(SQLModel, table=True):
    """AI Agent data model"""

    __tablename__ = "agents"

    # Primary key
    id: Optional[int] = Field(default=None, primary_key=True)

    # Agent identity
    name: str = Field(max_length=100, description="Agent display name")
    avatar: Optional[str] = Field(default=None, description="Avatar URL or emoji")
    description: Optional[str] = Field(default=None, description="Agent description")

    # LLM configuration
    model: str = Field(default="gpt-4", description="LLM model name")
    api_key: str = Field(description="Encrypted API key")
    api_base: Optional[str] = Field(default=None, description="Custom API base URL")

    # Agent behavior settings
    system_prompt: str = Field(
        default="You are a helpful AI assistant.", description="System prompt"
    )
    response_speed: float = Field(
        default=1.0, description="Response speed multiplier (0.5-2.0)"
    )
    reply_probability: float = Field(
        default=0.8, description="Probability of replying (0-1)"
    )

    # Length control (1-5)
    default_length: int = Field(
        default=3, ge=1, le=5, description="Default response length level"
    )

    # Status
    is_active: bool = Field(default=True, description="Whether agent is active")
    is_public: bool = Field(
        default=False, description="Whether agent is publicly visible"
    )

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        """Pydantic config"""

        from_attributes = True


class AgentCreate(SQLModel):
    """Schema for creating a new agent"""

    name: str
    avatar: Optional[str] = None
    description: Optional[str] = None
    model: str = "gpt-4"
    api_key: str
    api_base: Optional[str] = None
    system_prompt: str = "You are a helpful AI assistant."
    response_speed: float = 1.0
    reply_probability: float = 0.8
    default_length: int = 3
    is_public: bool = False


class AgentUpdate(SQLModel):
    """Schema for updating an existing agent"""

    name: Optional[str] = None
    avatar: Optional[str] = None
    description: Optional[str] = None
    model: Optional[str] = None
    api_key: Optional[str] = None
    api_base: Optional[str] = None
    system_prompt: Optional[str] = None
    response_speed: Optional[float] = None
    reply_probability: Optional[float] = None
    default_length: Optional[int] = None
    is_active: Optional[bool] = None
    is_public: Optional[bool] = None


class AgentResponse(SQLModel):
    """Schema for agent response (without exposing API key)"""

    id: int
    name: str
    avatar: Optional[str]
    description: Optional[str]
    model: str
    api_base: Optional[str]
    system_prompt: str
    response_speed: float
    reply_probability: float
    default_length: int
    is_active: bool
    is_public: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

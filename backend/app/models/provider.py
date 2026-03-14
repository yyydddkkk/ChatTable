from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class Provider(SQLModel, table=True):
    __tablename__ = "providers"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, description="Provider display name")
    api_key: str = Field(description="Encrypted API key")
    api_base: str = Field(description="API base URL")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

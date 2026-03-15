from typing import Optional
from datetime import datetime
from sqlalchemy import Index
from sqlmodel import SQLModel, Field


class Provider(SQLModel, table=True):
    __tablename__ = "providers"
    __table_args__ = (
        Index("ix_providers_tenant_name", "tenant_id", "name"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: str = Field(default="local", index=True, max_length=100)
    name: str = Field(max_length=100, description="Provider display name")
    api_key: str = Field(description="Encrypted API key")
    api_base: str = Field(description="API base URL")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

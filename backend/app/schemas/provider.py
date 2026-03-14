from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ProviderCreate(BaseModel):
    name: str = Field(max_length=100)
    api_key: str
    api_base: str


class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    api_key: Optional[str] = None
    api_base: Optional[str] = None


class ProviderResponse(BaseModel):
    id: int
    name: str
    api_base: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

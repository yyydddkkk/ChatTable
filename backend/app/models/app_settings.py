from typing import Optional
from sqlmodel import SQLModel, Field


class AppSettings(SQLModel, table=True):
    __tablename__ = "app_settings"

    id: int = Field(default=1, primary_key=True)
    optimizer_provider_id: Optional[int] = Field(default=None)
    optimizer_model: str = Field(default="qwen-plus")

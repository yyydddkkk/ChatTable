from typing import Optional
from sqlalchemy import UniqueConstraint
from sqlmodel import SQLModel, Field


class AppSettings(SQLModel, table=True):
    __tablename__ = "app_settings"
    __table_args__ = (
        UniqueConstraint("tenant_id", name="uq_app_settings_tenant_id"),
    )

    id: int = Field(default=1, primary_key=True)
    tenant_id: str = Field(default="local", index=True, max_length=100)
    optimizer_provider_id: Optional[int] = Field(default=None)
    optimizer_model: str = Field(default="qwen-plus")

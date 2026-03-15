from datetime import datetime
from typing import Optional

from sqlalchemy import Index
from sqlmodel import Field, SQLModel


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_tenant_created_at", "tenant_id", "created_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: str = Field(default="local", index=True, max_length=100)
    user_id: str = Field(default="anonymous", max_length=100)
    request_id: str = Field(default="system", max_length=100)
    action: str = Field(max_length=120)
    resource: str = Field(max_length=120)
    resource_id: Optional[str] = Field(default=None, max_length=120)
    details: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True

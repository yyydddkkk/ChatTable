import json
from typing import Any

from sqlmodel import Session

from app.core.config import get_logger
from app.core.request_context import get_request_context
from app.models.audit_log import AuditLog

logger = get_logger(__name__)


def log_audit(
    db: Session,
    *,
    action: str,
    resource: str,
    resource_id: str | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    try:
        ctx = get_request_context()
    except Exception:
        ctx = None

    entry = AuditLog(
        tenant_id=(ctx.tenant_id if ctx else "local"),
        user_id=(ctx.user_id if ctx else "anonymous"),
        request_id=(ctx.request_id if ctx else "system"),
        action=action,
        resource=resource,
        resource_id=resource_id,
        details=json.dumps(details, ensure_ascii=False) if details else None,
    )
    db.add(entry)

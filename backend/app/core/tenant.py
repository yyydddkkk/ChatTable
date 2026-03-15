from app.core.request_context import get_request_context


def get_current_tenant_id() -> str:
    try:
        tenant_id = get_request_context().tenant_id
        return tenant_id or "local"
    except Exception:
        return "local"

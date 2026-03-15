from contextvars import ContextVar
from dataclasses import dataclass
from typing import Mapping
from uuid import uuid4


@dataclass(frozen=True)
class RequestContext:
    tenant_id: str
    user_id: str
    request_id: str


_request_context_var: ContextVar[RequestContext] = ContextVar(
    "request_context",
    default=RequestContext(
        tenant_id="local",
        user_id="anonymous",
        request_id="system",
    ),
)


def build_request_context(headers: Mapping[str, str]) -> RequestContext:
    tenant_id = headers.get("x-tenant-id") or "local"
    user_id = headers.get("x-user-id") or "anonymous"
    request_id = headers.get("x-request-id") or str(uuid4())
    return RequestContext(
        tenant_id=tenant_id,
        user_id=user_id,
        request_id=request_id,
    )


def set_request_context(ctx: RequestContext):
    return _request_context_var.set(ctx)


def reset_request_context(token) -> None:
    _request_context_var.reset(token)


def get_request_context() -> RequestContext:
    return _request_context_var.get()

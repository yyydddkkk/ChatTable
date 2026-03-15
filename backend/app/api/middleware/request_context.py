from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.request_context import (
    build_request_context,
    reset_request_context,
    set_request_context,
)
from app.services.auth_service import auth_service

PUBLIC_PATHS = {"/", "/health"}
AUTH_OPEN_PREFIX = "/api/v1/auth/"


async def request_context_middleware(request: Request, call_next):
    request_path = request.url.path
    allow_invalid_bearer = request_path in PUBLIC_PATHS or request_path.startswith(
        AUTH_OPEN_PREFIX
    )
    ctx = build_request_context(request.headers)
    authorization = request.headers.get("authorization")
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        try:
            payload = auth_service.decode_access_token(token)
            token_tenant = str(payload.get("tenant_id") or "local")
            token_user = str(payload.get("sub") or "anonymous")
            # Reject mismatched tenant hints to avoid cross-tenant spoofing.
            if (
                request.headers.get("x-tenant-id")
                and request.headers.get("x-tenant-id") != token_tenant
            ):
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Tenant mismatch between token and header"},
                )
            ctx = ctx.__class__(
                tenant_id=token_tenant,
                user_id=token_user,
                request_id=ctx.request_id,
            )
        except Exception:
            if allow_invalid_bearer:
                token = set_request_context(ctx)
                try:
                    response = await call_next(request)
                    response.headers["X-Request-Id"] = ctx.request_id
                    return response
                finally:
                    reset_request_context(token)
            return JSONResponse(status_code=401, content={"detail": "Invalid token"})

    token = set_request_context(ctx)
    try:
        response = await call_next(request)
        response.headers["X-Request-Id"] = ctx.request_id
        return response
    finally:
        reset_request_context(token)

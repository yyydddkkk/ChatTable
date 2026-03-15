from fastapi import Request

from app.core.request_context import (
    build_request_context,
    reset_request_context,
    set_request_context,
)


async def request_context_middleware(request: Request, call_next):
    ctx = build_request_context(request.headers)
    token = set_request_context(ctx)
    try:
        response = await call_next(request)
        response.headers["X-Request-Id"] = ctx.request_id
        return response
    finally:
        reset_request_context(token)

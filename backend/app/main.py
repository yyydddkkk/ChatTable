from contextlib import asynccontextmanager
from typing import Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from app.api.middleware.request_context import request_context_middleware
from app.api.v1.router import api_router
from app.core.config import get_logger, settings, setup_logging
from app.core.database import engine, init_db
from app.core.redis_client import redis_health
from app.core.request_context import (
    RequestContext,
    build_request_context,
    reset_request_context,
    set_request_context,
)
from app.core.websocket import manager
from app.core.chat_handler import chat_handler
from app.modules.engine.infrastructure.factory import create_chat_engine
from app.modules.im.application.chat_application_service import ChatApplicationService
from app.services.auth_service import auth_service

logger = get_logger(__name__)
chat_application_service = ChatApplicationService(
    engine=create_chat_engine(chat_handler)
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    setup_logging()
    logger.info("Starting ChatTable API")
    init_db()
    logger.info("Database initialized")
    if redis_health():
        logger.info("Redis connected")
    else:
        logger.warning("Redis is not available")
    yield
    logger.info("Shutting down ChatTable API")


app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router)
app.middleware("http")(request_context_middleware)


@app.get("/")
async def root():
    return {"message": "ChatTable API"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    ctx = build_request_context(websocket.headers)
    query_tenant_id = websocket.query_params.get("tenant_id")
    query_access_token = websocket.query_params.get("access_token")

    if query_access_token:
        try:
            payload = auth_service.decode_access_token(query_access_token)
            token_tenant = str(payload.get("tenant_id") or "local")
            token_user = str(payload.get("sub") or "anonymous")
            if query_tenant_id and query_tenant_id != token_tenant:
                await websocket.close(code=1008, reason="Tenant mismatch")
                return
            ctx = RequestContext(
                tenant_id=token_tenant,
                user_id=token_user,
                request_id=ctx.request_id,
            )
        except Exception:
            await websocket.close(code=1008, reason="Invalid token")
            return
    elif query_tenant_id:
        ctx = RequestContext(
            tenant_id=query_tenant_id,
            user_id=ctx.user_id,
            request_id=ctx.request_id,
        )

    token = set_request_context(ctx)

    await manager.connect(websocket, conversation_id)
    logger.info(
        "WebSocket connected: tenant=%s user=%s conversation_id=%s",
        ctx.tenant_id,
        ctx.user_id,
        conversation_id,
    )
    conversation_lengths: Dict[int, int] = {}

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "pong":
                continue

            if msg_type == "set_length":
                level = max(1, min(5, data.get("level", 3)))
                conversation_lengths[int(conversation_id)] = level
                await manager.broadcast(
                    {"type": "length_set", "level": level},
                    conversation_id,
                )
                continue

            if msg_type == "clear":
                with Session(engine) as db:
                    await chat_application_service.handle_clear(
                        conversation_id=conversation_id,
                        db=db,
                        ws_manager=manager,
                    )
                continue

            if msg_type == "user_message":
                content = data.get("content", "")
                with Session(engine) as db:
                    await chat_application_service.handle_user_message(
                        conversation_id, content, db, manager, conversation_lengths
                    )
                continue

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: conversation_id={conversation_id}")
        manager.disconnect(websocket, conversation_id)
    finally:
        reset_request_context(token)

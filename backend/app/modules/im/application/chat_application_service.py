from typing import Dict

from sqlmodel import Session

from app.core.config import get_logger
from app.core.request_context import get_request_context
from app.core.websocket import ConnectionManager
from app.modules.engine.application.ports import ChatEnginePort

logger = get_logger(__name__)


class ChatApplicationService:
    """IM application-layer orchestration for chat events."""

    def __init__(self, engine: ChatEnginePort):
        self._engine = engine

    async def handle_clear(
        self,
        conversation_id: str,
        db: Session,
        ws_manager: ConnectionManager,
    ) -> None:
        ctx = get_request_context()
        logger.info(
            "Clear conversation request: tenant=%s user=%s conversation=%s",
            ctx.tenant_id,
            ctx.user_id,
            conversation_id,
        )
        await self._engine.clear_conversation(
            conversation_id=conversation_id,
            db=db,
            ws_manager=ws_manager,
        )

    async def handle_user_message(
        self,
        conversation_id: str,
        content: str,
        db: Session,
        ws_manager: ConnectionManager,
        conversation_lengths: Dict[int, int],
    ) -> None:
        ctx = get_request_context()
        logger.info(
            "User message request: tenant=%s user=%s conversation=%s",
            ctx.tenant_id,
            ctx.user_id,
            conversation_id,
        )
        await self._engine.process_user_message(
            conversation_id=conversation_id,
            content=content,
            db=db,
            ws_manager=ws_manager,
            conversation_lengths=conversation_lengths,
        )

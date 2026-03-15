from typing import Dict

from sqlmodel import Session

from app.core.chat_handler import ChatHandler
from app.core.websocket import ConnectionManager
from app.modules.engine.application.ports import ChatEnginePort


class LegacyChatEngine(ChatEnginePort):
    """Adapter that keeps existing chat behavior behind an engine interface."""

    def __init__(self, chat_handler: ChatHandler):
        self._chat_handler = chat_handler

    async def clear_conversation(
        self,
        conversation_id: str,
        db: Session,
        ws_manager: ConnectionManager,
    ) -> None:
        await self._chat_handler.handle_clear(conversation_id, db, ws_manager)

    async def process_user_message(
        self,
        conversation_id: str,
        content: str,
        db: Session,
        ws_manager: ConnectionManager,
        conversation_lengths: Dict[int, int],
    ) -> None:
        await self._chat_handler.handle_user_message(
            conversation_id=conversation_id,
            content=content,
            db=db,
            ws_manager=ws_manager,
            conversation_lengths=conversation_lengths,
        )

from typing import Dict, Protocol

from sqlmodel import Session

from app.core.websocket import ConnectionManager


class ChatEnginePort(Protocol):
    async def clear_conversation(
        self,
        conversation_id: str,
        db: Session,
        ws_manager: ConnectionManager,
    ) -> None:
        ...

    async def process_user_message(
        self,
        conversation_id: str,
        content: str,
        db: Session,
        ws_manager: ConnectionManager,
        conversation_lengths: Dict[int, int],
    ) -> None:
        ...

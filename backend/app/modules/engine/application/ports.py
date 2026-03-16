from typing import Dict, Protocol, TYPE_CHECKING

from sqlmodel import Session

from app.core.websocket import ConnectionManager

if TYPE_CHECKING:
    from app.modules.dispatcher.domain.schemas import DispatchPlan


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

    async def process_user_message_with_plan(
        self,
        conversation_id: str,
        content: str,
        plan: "DispatchPlan",
        db: Session,
        ws_manager: ConnectionManager,
        conversation_lengths: Dict[int, int],
    ) -> None:
        ...

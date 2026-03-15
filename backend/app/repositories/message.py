from typing import Optional
from sqlmodel import Session, select
from app.models.message import Message
from app.schemas.message import MessageCreate
from app.repositories.base import BaseRepository
from pydantic import BaseModel


class MessageRepository(BaseRepository[Message, MessageCreate, BaseModel]):
    def get_by_conversation(
        self, db: Session, conversation_id: int, skip: int = 0, limit: int = 50
    ) -> list[Message]:
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .offset(skip)
            .limit(limit)
        )
        stmt = self._apply_tenant_filter(stmt)
        return db.exec(stmt).all()

    def get_by_agent(
        self, db: Session, agent_id: int, conversation_id: int, limit: int = 20
    ) -> list[Message]:
        stmt = (
            select(Message)
            .where(
                Message.sender_id == agent_id,
                Message.conversation_id == conversation_id,
            )
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        stmt = self._apply_tenant_filter(stmt)
        return db.exec(stmt).all()


message_repository = MessageRepository(Message)

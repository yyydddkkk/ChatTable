from typing import Optional
from sqlmodel import Session, select
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.conversation import ConversationCreate
from app.schemas.message import MessageCreate
from app.repositories.conversation import conversation_repository
from app.repositories.message import message_repository
from app.core.audit import log_audit
from app.core.tenant import get_current_tenant_id


class ConversationService:
    def __init__(self):
        self.repository = conversation_repository
        self.message_repository = message_repository

    def list_conversations(
        self, db: Session, skip: int = 0, limit: int = 100
    ) -> list[Conversation]:
        return self.repository.get_multi(db, skip, limit)

    def get_conversation(
        self, db: Session, conversation_id: int
    ) -> Optional[Conversation]:
        return self.repository.get_by_id(db, conversation_id)

    def create_conversation(
        self, db: Session, conversation_in: ConversationCreate
    ) -> Conversation:
        tenant_id = get_current_tenant_id()
        # Prevent duplicate private conversations for the same agent
        if conversation_in.type == 'private':
            existing = db.exec(
                select(Conversation).where(
                    Conversation.tenant_id == tenant_id,
                    Conversation.type == 'private',
                    Conversation.members == conversation_in.members,
                )
            ).first()
            if existing:
                return existing

        conversation = Conversation(
            tenant_id=tenant_id,
            type=conversation_in.type,
            name=conversation_in.name,
            members=conversation_in.members,
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        log_audit(
            db,
            action="conversation.create",
            resource="conversation",
            resource_id=str(conversation.id),
            details={"type": conversation.type},
        )
        db.commit()
        return conversation

    def get_messages(
        self, db: Session, conversation_id: int, skip: int = 0, limit: int = 50
    ) -> list[Message]:
        return self.message_repository.get_by_conversation(
            db, conversation_id, skip, limit
        )


conversation_service = ConversationService()

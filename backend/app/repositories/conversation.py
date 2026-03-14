from typing import Optional
from sqlmodel import Session, select
from app.models.conversation import Conversation
from app.schemas.conversation import ConversationCreate
from app.repositories.base import BaseRepository
from pydantic import BaseModel


class ConversationRepository(
    BaseRepository[Conversation, ConversationCreate, BaseModel]
):
    def get_by_id(self, db: Session, conversation_id: int) -> Optional[Conversation]:
        return db.get(Conversation, conversation_id)


conversation_repository = ConversationRepository(Conversation)

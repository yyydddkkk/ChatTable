from typing import Optional
from sqlmodel import Session, select
from app.models.agent import Agent
from app.schemas.agent import AgentCreate, AgentUpdate
from app.repositories.base import BaseRepository


class AgentRepository(BaseRepository[Agent, AgentCreate, AgentUpdate]):
    def get_by_id(self, db: Session, agent_id: int) -> Optional[Agent]:
        return db.get(Agent, agent_id)

    def get_active_agents(
        self, db: Session, skip: int = 0, limit: int = 100
    ) -> list[Agent]:
        return db.exec(
            select(Agent).where(Agent.is_active == True).offset(skip).limit(limit)
        ).all()

    def get_public_agents(
        self, db: Session, skip: int = 0, limit: int = 100
    ) -> list[Agent]:
        return db.exec(
            select(Agent).where(Agent.is_public == True).offset(skip).limit(limit)
        ).all()


agent_repository = AgentRepository(Agent)

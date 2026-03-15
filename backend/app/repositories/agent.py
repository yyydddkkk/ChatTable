from typing import Optional
from sqlmodel import Session, select
from app.models.agent import Agent
from app.schemas.agent import AgentCreate, AgentUpdate
from app.repositories.base import BaseRepository


class AgentRepository(BaseRepository[Agent, AgentCreate, AgentUpdate]):
    def get_by_id(self, db: Session, agent_id: int) -> Optional[Agent]:
        return self.get(db, agent_id)

    def get_active_agents(
        self, db: Session, skip: int = 0, limit: int = 100
    ) -> list[Agent]:
        stmt = (
            select(Agent).where(Agent.is_active == True).offset(skip).limit(limit)
        )
        stmt = self._apply_tenant_filter(stmt)
        return db.exec(stmt).all()

    def get_public_agents(
        self, db: Session, skip: int = 0, limit: int = 100
    ) -> list[Agent]:
        stmt = (
            select(Agent).where(Agent.is_public == True).offset(skip).limit(limit)
        )
        stmt = self._apply_tenant_filter(stmt)
        return db.exec(stmt).all()


agent_repository = AgentRepository(Agent)

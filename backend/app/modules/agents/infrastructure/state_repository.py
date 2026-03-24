import json
from datetime import datetime

from sqlmodel import Session, select

from app.core.tenant import get_current_tenant_id
from app.models.agent_checkpoint import AgentCheckpoint
from app.models.agent_event_log import AgentEventLog
from app.models.agent_memory_entry import AgentMemoryEntry
from app.models.agent_relationship_state import AgentRelationshipState
from app.models.agent_runtime_state import AgentRuntimeState


class AgentStateRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def save_runtime_state(
        self,
        *,
        agent_id: int,
        mood: str,
        activity_level: float,
        attention_topics: list[str],
        relationship_strength: float,
    ) -> AgentRuntimeState:
        tenant_id = get_current_tenant_id()
        row = self._db.exec(
            select(AgentRuntimeState).where(
                AgentRuntimeState.tenant_id == tenant_id,
                AgentRuntimeState.agent_id == agent_id,
            )
        ).first()
        if row is None:
            row = AgentRuntimeState(agent_id=agent_id, tenant_id=tenant_id)
        row.mood = mood
        row.activity_level = activity_level
        row.relationship_strength = relationship_strength
        row.attention_topics_json = json.dumps(attention_topics, ensure_ascii=False)
        row.updated_at = datetime.now()
        self._db.add(row)
        self._db.commit()
        self._db.refresh(row)
        return row

    def save_relationship_state(
        self,
        *,
        agent_id: int,
        user_id: int,
        affinity_score: float,
        trust_score: float,
        summary: str,
    ) -> AgentRelationshipState:
        tenant_id = get_current_tenant_id()
        row = self._db.exec(
            select(AgentRelationshipState).where(
                AgentRelationshipState.tenant_id == tenant_id,
                AgentRelationshipState.agent_id == agent_id,
                AgentRelationshipState.user_id == user_id,
            )
        ).first()
        if row is None:
            row = AgentRelationshipState(
                tenant_id=tenant_id,
                agent_id=agent_id,
                user_id=user_id,
            )
        row.affinity_score = affinity_score
        row.trust_score = trust_score
        row.summary = summary
        row.updated_at = datetime.now()
        self._db.add(row)
        self._db.commit()
        self._db.refresh(row)
        return row

    def log_event(
        self,
        *,
        agent_id: int,
        conversation_id: int,
        event_id: str,
        event_type: str,
        payload: dict,
    ) -> AgentEventLog:
        row = AgentEventLog(
            tenant_id=get_current_tenant_id(),
            agent_id=agent_id,
            conversation_id=conversation_id,
            event_id=event_id,
            event_type=event_type,
            payload_json=json.dumps(payload, ensure_ascii=False),
        )
        self._db.add(row)
        self._db.commit()
        self._db.refresh(row)
        return row

    def save_checkpoint(
        self,
        *,
        agent_id: int,
        checkpoint_key: str,
        state_json: str,
    ) -> AgentCheckpoint:
        tenant_id = get_current_tenant_id()
        row = self._db.exec(
            select(AgentCheckpoint).where(
                AgentCheckpoint.tenant_id == tenant_id,
                AgentCheckpoint.agent_id == agent_id,
                AgentCheckpoint.checkpoint_key == checkpoint_key,
            )
        ).first()
        if row is None:
            row = AgentCheckpoint(
                tenant_id=tenant_id,
                agent_id=agent_id,
                checkpoint_key=checkpoint_key,
            )
        row.state_json = state_json
        row.updated_at = datetime.now()
        self._db.add(row)
        self._db.commit()
        self._db.refresh(row)
        return row

    def add_memory_entry(
        self,
        *,
        agent_id: int,
        conversation_id: int,
        memory_type: str,
        content: str,
        importance_score: float,
    ) -> AgentMemoryEntry:
        row = AgentMemoryEntry(
            tenant_id=get_current_tenant_id(),
            agent_id=agent_id,
            conversation_id=conversation_id,
            memory_type=memory_type,
            content=content,
            importance_score=importance_score,
        )
        self._db.add(row)
        self._db.commit()
        self._db.refresh(row)
        return row

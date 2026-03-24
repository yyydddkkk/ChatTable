from typing import Sequence

from app.modules.agents.domain.agent_event import AgentEvent


class AgentRuntimeService:
    async def broadcast(
        self,
        *,
        conversation_id: str,
        event: AgentEvent,
        agent_ids: Sequence[int],
    ) -> None:
        raise NotImplementedError

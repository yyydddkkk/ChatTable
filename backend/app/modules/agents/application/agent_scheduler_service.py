from collections.abc import Callable, Sequence
from datetime import datetime
from types import SimpleNamespace

from app.modules.agents.application.agent_runtime_service import AgentRuntimeService
from app.modules.agents.domain.agent_event import AgentEvent


class AgentSchedulerService:
    def __init__(
        self,
        runtime_service: AgentRuntimeService,
        candidate_loader: Callable[[], Sequence[object]],
        now_provider: Callable[[], datetime] | None = None,
    ) -> None:
        self._runtime_service = runtime_service
        self._candidate_loader = candidate_loader
        self._now_provider = now_provider or datetime.now

    async def tick(self) -> int:
        now = self._now_provider()
        emitted = 0
        for candidate in self._candidate_loader():
            if not self._is_active_now(candidate, now):
                continue
            if self._is_cooling_down(candidate, now):
                continue

            event = AgentEvent(
                event_id=f"wake-up:{candidate.agent_id}:{int(now.timestamp())}",
                conversation_id=int(candidate.conversation_id),
                agent_id=int(candidate.agent_id),
                event_type="wake_up",
                content="",
                metadata={"scheduled_at": now.isoformat()},
            )
            await self._runtime_service.broadcast(
                conversation_id=str(candidate.conversation_id),
                event=event,
                agent_ids=[int(candidate.agent_id)],
            )
            emitted += 1
        return emitted

    @staticmethod
    def _is_active_now(candidate: object, now: datetime) -> bool:
        start_hour, end_hour = getattr(candidate, "active_hours", (0, 24))
        return start_hour <= now.hour < end_hour

    @staticmethod
    def _is_cooling_down(candidate: object, now: datetime) -> bool:
        cooldown_until = getattr(candidate, "cooldown_until", None)
        return cooldown_until is not None and cooldown_until > now

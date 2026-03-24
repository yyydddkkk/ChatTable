from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

from app.modules.agents.application.agent_scheduler_service import AgentSchedulerService


class _FakeRuntimeService:
    def __init__(self):
        self.broadcast_calls = []

    async def broadcast(self, *, conversation_id, event, agent_ids):
        self.broadcast_calls.append(
            {
                "conversation_id": conversation_id,
                "event": event,
                "agent_ids": agent_ids,
            }
        )


@pytest.mark.anyio
async def test_scheduler_emits_wake_up_event_for_eligible_agent() -> None:
    runtime_service = _FakeRuntimeService()
    fixed_now = datetime(2026, 3, 19, 20, 0, 0)
    scheduler = AgentSchedulerService(
        runtime_service=runtime_service,
        candidate_loader=lambda: [
            SimpleNamespace(agent_id=7, conversation_id=11, active_hours=(8, 23), cooldown_until=None),
            SimpleNamespace(agent_id=8, conversation_id=11, active_hours=(8, 23), cooldown_until=fixed_now + timedelta(minutes=5)),
        ],
        now_provider=lambda: fixed_now,
    )

    emitted = await scheduler.tick()

    assert emitted == 1
    assert len(runtime_service.broadcast_calls) == 1
    call = runtime_service.broadcast_calls[0]
    assert call["conversation_id"] == "11"
    assert call["agent_ids"] == [7]
    assert call["event"].event_type == "wake_up"


@pytest.mark.anyio
async def test_scheduler_respects_active_window() -> None:
    runtime_service = _FakeRuntimeService()
    scheduler = AgentSchedulerService(
        runtime_service=runtime_service,
        candidate_loader=lambda: [
            SimpleNamespace(agent_id=7, conversation_id=11, active_hours=(9, 18), cooldown_until=None),
        ],
        now_provider=lambda: datetime(2026, 3, 19, 23, 0, 0),
    )

    emitted = await scheduler.tick()

    assert emitted == 0
    assert runtime_service.broadcast_calls == []

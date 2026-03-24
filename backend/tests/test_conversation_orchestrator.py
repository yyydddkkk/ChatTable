from datetime import datetime
from types import SimpleNamespace

import pytest

from app.modules.agents.application.conversation_orchestrator import (
    ConversationOrchestrator,
)


class _FakeDb:
    def __init__(self):
        self.added = []
        self._next_id = 1

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        return None

    def refresh(self, obj):
        if getattr(obj, "id", None) is None:
            obj.id = self._next_id
            self._next_id += 1
        if getattr(obj, "created_at", None) is None:
            obj.created_at = datetime.now()


class _FakeWsManager:
    def __init__(self):
        self.events = []

    async def broadcast(self, message, conversation_id):
        self.events.append((conversation_id, message))


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
async def test_orchestrator_broadcasts_group_event_to_all_active_agents() -> None:
    runtime_service = _FakeRuntimeService()
    orchestrator = ConversationOrchestrator(
        runtime_service=runtime_service,
        active_agent_loader=lambda _db, _conversation_id: [
            SimpleNamespace(id=7),
            SimpleNamespace(id=11),
        ],
    )
    db = _FakeDb()
    ws = _FakeWsManager()

    await orchestrator.handle_user_message(
        conversation_id="10",
        content="hello everyone",
        db=db,
        ws_manager=ws,
    )

    assert len(runtime_service.broadcast_calls) == 1
    call = runtime_service.broadcast_calls[0]
    assert call["conversation_id"] == "10"
    assert call["agent_ids"] == [7, 11]
    assert call["event"].conversation_id == 10
    assert call["event"].content == "hello everyone"
    assert ws.events[0][1]["type"] == "user_message"

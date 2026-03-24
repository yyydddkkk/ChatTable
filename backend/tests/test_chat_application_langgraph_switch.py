import pytest

from app.core.config import settings
from app.modules.im.application.chat_application_service import ChatApplicationService


class _FakeEngine:
    def __init__(self):
        self.calls = []

    async def clear_conversation(self, **kwargs):
        self.calls.append(("clear", kwargs))

    async def process_user_message(self, **kwargs):
        self.calls.append(("engine", kwargs))

    async def process_user_message_with_plan(self, **kwargs):
        self.calls.append(("plan", kwargs))


class _FakeDispatcher:
    def __init__(self):
        self.calls = []

    async def handle_user_message(self, **kwargs):
        self.calls.append(kwargs)


class _FakeOrchestrator:
    def __init__(self):
        self.calls = []

    async def handle_user_message(self, **kwargs):
        self.calls.append(kwargs)


@pytest.mark.anyio
async def test_chat_application_uses_langgraph_runtime_when_enabled() -> None:
    original_mode = settings.agent_runtime_mode
    settings.agent_runtime_mode = "langgraph"
    try:
        engine = _FakeEngine()
        dispatcher = _FakeDispatcher()
        orchestrator = _FakeOrchestrator()
        service = ChatApplicationService(
            engine=engine,
            dispatcher=dispatcher,
            orchestrator=orchestrator,
        )

        await service.handle_user_message(
            conversation_id="10",
            content="hello",
            db=None,
            ws_manager=None,
            conversation_lengths={},
        )

        assert len(orchestrator.calls) == 1
        assert dispatcher.calls == []
        assert engine.calls == []
    finally:
        settings.agent_runtime_mode = original_mode


@pytest.mark.anyio
async def test_chat_application_keeps_legacy_path_when_langgraph_disabled() -> None:
    original_mode = settings.agent_runtime_mode
    settings.agent_runtime_mode = "legacy"
    try:
        engine = _FakeEngine()
        dispatcher = _FakeDispatcher()
        orchestrator = _FakeOrchestrator()
        service = ChatApplicationService(
            engine=engine,
            dispatcher=dispatcher,
            orchestrator=orchestrator,
        )

        await service.handle_user_message(
            conversation_id="10",
            content="hello",
            db=None,
            ws_manager=None,
            conversation_lengths={},
        )

        assert orchestrator.calls == []
        assert len(dispatcher.calls) == 1
        assert engine.calls == []
    finally:
        settings.agent_runtime_mode = original_mode

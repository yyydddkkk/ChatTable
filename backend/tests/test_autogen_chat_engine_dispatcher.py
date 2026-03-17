from datetime import datetime
from types import SimpleNamespace

import pytest

from app.modules.dispatcher.domain.schemas import (
    DispatchPlan,
    ExecutionStage,
    RoundControl,
    SelectedAgent,
)
from app.modules.engine.infrastructure.autogen_chat_engine import AutogenChatEngine


class _FakeResult:
    def __init__(self, first_value):
        self._first_value = first_value

    def first(self):
        return self._first_value


class _FakeDb:
    def __init__(self, conversation):
        self._conversation = conversation
        self._next_id = 1000

    def exec(self, statement):
        sql = str(statement).lower()
        if "from conversations" in sql:
            return _FakeResult(self._conversation)
        return _FakeResult(None)

    def add(self, _obj):
        return None

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


def _build_plan() -> DispatchPlan:
    return DispatchPlan(
        plan_id="plan-1",
        conversation_id=24,
        trigger_message_id=133,
        selected_agents=[
            SelectedAgent(agent_id=1, priority=100, reason_tag="test"),
            SelectedAgent(agent_id=2, priority=90, reason_tag="test"),
        ],
        execution_graph=[
            ExecutionStage(stage=1, mode="parallel", agents=[1, 2]),
        ],
        round_control=RoundControl(
            max_rounds=2,
            trigger_next_round=False,
            next_round_candidates=[],
        ),
        deferred_candidates=[],
    )


@pytest.mark.anyio
async def test_dispatcher_parallel_stage_runs_agents_independently(monkeypatch):
    engine = AutogenChatEngine()
    plan = _build_plan()
    ws = _FakeWsManager()
    db = _FakeDb(conversation=SimpleNamespace(type="group"))
    fake_agents = [
        SimpleNamespace(id=1, name="LiBai"),
        SimpleNamespace(id=2, name="Jack"),
    ]

    monkeypatch.setattr(
        "app.modules.engine.infrastructure.autogen_chat_engine.get_conversation_agents",
        lambda _db, _conv_id: fake_agents,
    )
    monkeypatch.setattr(
        "app.modules.engine.infrastructure.autogen_chat_engine.parse_mentions",
        lambda content, _agents: (content, []),
    )
    monkeypatch.setattr(
        "app.modules.engine.infrastructure.autogen_chat_engine.topic_detector.detect_topic_switch",
        lambda _content: False,
    )
    monkeypatch.setattr(
        "app.modules.engine.infrastructure.autogen_chat_engine.length_controller.detect_trigger",
        lambda _content: 0,
    )
    monkeypatch.setattr(
        "app.modules.engine.infrastructure.autogen_chat_engine.memory_manager.add_message",
        lambda _db, _conv_id, _agent_id, _msg: None,
    )

    run_calls = []

    async def fake_run_team(**kwargs):
        run_calls.append(kwargs)

    monkeypatch.setattr(engine, "_run_team", fake_run_team)

    await engine.process_user_message_with_plan(
        conversation_id="24",
        content="Please introduce yourselves one by one.",
        plan=plan,
        pre_saved_user_message_id=None,
        db=db,
        ws_manager=ws,
        conversation_lengths={24: 3},
    )

    assert len(run_calls) == 2
    assert [call["agents"][0].id for call in run_calls] == [1, 2]
    assert all(call["is_group"] is False for call in run_calls)
    assert all(call["use_checkpoint"] is False for call in run_calls)
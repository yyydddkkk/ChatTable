from dataclasses import dataclass

import pytest

from app.modules.dispatcher.application.dispatcher_service import (
    DispatcherService,
    MessageDispatchContext,
)
from app.modules.dispatcher.domain.schemas import (
    DispatchPlan,
    ExecutionStage,
    RoundControl,
    SelectedAgent,
)
from app.modules.dispatcher.infrastructure.planner_client import PlannerOutcome


class FakeEngine:
    def __init__(self) -> None:
        self.calls = []

    async def process_user_message_with_plan(
        self,
        conversation_id,
        content,
        plan,
        db,
        ws_manager,
        conversation_lengths,
    ) -> None:
        self.calls.append(
            {
                "conversation_id": conversation_id,
                "content": content,
                "plan": plan,
                "conversation_lengths": conversation_lengths,
            }
        )


class FakePlanner:
    def __init__(self, outcome: PlannerOutcome) -> None:
        self.outcome = outcome
        self.last_call: dict | None = None

    async def plan(
        self,
        conversation_id,
        trigger_message_id,
        message_content,
        active_agent_ids,
        mentioned_ids,
        is_group,
        planner_api_key=None,
        planner_api_base=None,
    ) -> PlannerOutcome:
        self.last_call = {
            "conversation_id": conversation_id,
            "trigger_message_id": trigger_message_id,
            "message_content": message_content,
            "active_agent_ids": active_agent_ids,
            "mentioned_ids": mentioned_ids,
            "is_group": is_group,
            "planner_api_key": planner_api_key,
            "planner_api_base": planner_api_base,
        }
        return self.outcome


class FakeWsManager:
    def __init__(self) -> None:
        self.events = []

    async def broadcast(self, message: dict, conversation_id: str) -> None:
        self.events.append((conversation_id, message))


def _plan() -> DispatchPlan:
    return DispatchPlan(
        plan_id="p-1",
        conversation_id=1,
        trigger_message_id=10,
        selected_agents=[SelectedAgent(agent_id=9, priority=100, reason_tag="mention")],
        execution_graph=[ExecutionStage(stage=1, mode="serial", agents=[9])],
        round_control=RoundControl(
            max_rounds=1,
            trigger_next_round=False,
            next_round_candidates=[],
        ),
        deferred_candidates=[],
    )


@pytest.mark.anyio
async def test_dispatcher_forwards_plan_to_engine(monkeypatch) -> None:
    plan = _plan()
    outcome = PlannerOutcome(
        plan=plan,
        used_fallback=False,
        failure_type=None,
        retry_count=0,
    )

    fake_planner = FakePlanner(outcome)
    service = DispatcherService(
        engine=FakeEngine(),
        planner_client=fake_planner,
        context_loader=lambda **_: MessageDispatchContext(
            conversation_id=1,
            trigger_message_id=123,
            cleaned_content="hello",
            active_agent_ids=[9],
            active_provider_ids=[99],
            mentioned_ids=[9],
            is_group=True,
        ),
    )

    monkeypatch.setattr(
        service,
        "_resolve_planner_credentials",
        lambda db, context: ("provider-key", "https://dashscope.aliyuncs.com/compatible-mode/v1"),
    )

    ws = FakeWsManager()
    await service.handle_user_message(
        conversation_id="1",
        content="@A hi",
        db=None,
        ws_manager=ws,
        conversation_lengths={1: 3},
    )

    assert len(service._engine.calls) == 1
    assert service._engine.calls[0]["plan"].plan_id == "p-1"
    assert fake_planner.last_call is not None
    assert fake_planner.last_call["planner_api_key"] == "provider-key"


@pytest.mark.anyio
async def test_dispatcher_emits_degraded_event_in_debug(monkeypatch) -> None:
    plan = _plan()
    outcome = PlannerOutcome(
        plan=plan,
        used_fallback=True,
        failure_type="timeout",
        retry_count=1,
    )

    monkeypatch.setattr(
        "app.modules.dispatcher.application.dispatcher_service.settings.dispatcher_debug_feedback",
        True,
    )

    service = DispatcherService(
        engine=FakeEngine(),
        planner_client=FakePlanner(outcome),
        context_loader=lambda **_: MessageDispatchContext(
            conversation_id=1,
            trigger_message_id=123,
            cleaned_content="hello",
            active_agent_ids=[9],
            active_provider_ids=[],
            mentioned_ids=[9],
            is_group=True,
        ),
    )

    ws = FakeWsManager()
    await service.handle_user_message(
        conversation_id="1",
        content="@A hi",
        db=None,
        ws_manager=ws,
        conversation_lengths={1: 3},
    )

    assert any(evt[1].get("type") == "dispatcher_degraded" for evt in ws.events)

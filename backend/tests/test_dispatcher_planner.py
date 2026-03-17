import pytest

from app.modules.dispatcher.infrastructure.planner_client import PlannerClient


class FakeCompletion:
    def __init__(self, outputs):
        self.outputs = outputs
        self.calls = 0

    async def __call__(
        self,
        *,
        model: str,
        api_key: str,
        api_base: str | None,
        messages: list[dict[str, str]],
        timeout_ms: int,
    ) -> str:
        output = self.outputs[self.calls]
        self.calls += 1
        if isinstance(output, Exception):
            raise output
        return output


@pytest.mark.anyio
async def test_planner_success_returns_structured_plan() -> None:
    fake = FakeCompletion(
        [
            """
            {
              "plan_id": "planner-1",
              "selected_agents": [
                {"agent_id": 2, "priority": 70, "reason_tag": "topic"},
                {"agent_id": 1, "priority": 90, "reason_tag": "mention"}
              ],
              "execution_graph": [{"stage": 1, "mode": "parallel", "agents": [1, 2]}],
              "round_control": {
                "max_rounds": 2,
                "trigger_next_round": false,
                "next_round_candidates": []
              }
            }
            """
        ]
    )

    client = PlannerClient(
        completion_fn=fake,
        hard_cap=5,
        retry_count=1,
        planner_model="qwen-plus",
        planner_api_key="k",
        planner_api_base="https://dashscope.aliyuncs.com/compatible-mode/v1",
        timeout_ms=2500,
    )

    outcome = await client.plan(
        conversation_id=11,
        trigger_message_id=22,
        message_content="@A 你好",
        active_agent_ids=[1, 2, 3],
        mentioned_ids=[1],
        is_group=True,
    )

    assert outcome.used_fallback is False
    assert [x.agent_id for x in outcome.plan.selected_agents] == [1, 2]
    assert fake.calls == 1


@pytest.mark.anyio
async def test_planner_primary_failure_then_retry_success(caplog) -> None:
    fake = FakeCompletion(
        [
            TimeoutError("timeout"),
            """
            {
              "plan_id": "planner-2",
              "selected_agents": [{"agent_id": 1, "priority": 90, "reason_tag": "mention"}],
              "execution_graph": [{"stage": 1, "mode": "serial", "agents": [1]}],
              "round_control": {"max_rounds": 1, "trigger_next_round": false, "next_round_candidates": []}
            }
            """,
        ]
    )

    client = PlannerClient(
        completion_fn=fake,
        hard_cap=5,
        retry_count=1,
        planner_model="qwen-plus",
        planner_api_key="k",
        planner_api_base=None,
        timeout_ms=2500,
    )

    outcome = await client.plan(
        conversation_id=11,
        trigger_message_id=22,
        message_content="hello",
        active_agent_ids=[1, 2],
        mentioned_ids=[],
        is_group=True,
    )

    assert outcome.used_fallback is False
    assert fake.calls == 2
    assert "planner_primary_failed" in caplog.text


@pytest.mark.anyio
async def test_planner_retry_failure_falls_back_and_logs(caplog) -> None:
    fake = FakeCompletion([RuntimeError("bad network"), RuntimeError("still bad")])

    client = PlannerClient(
        completion_fn=fake,
        hard_cap=5,
        retry_count=1,
        planner_model="qwen-plus",
        planner_api_key="k",
        planner_api_base=None,
        timeout_ms=2500,
    )

    outcome = await client.plan(
        conversation_id=11,
        trigger_message_id=22,
        message_content="@BotA hi",
        active_agent_ids=[8, 9],
        mentioned_ids=[9],
        is_group=True,
    )

    assert outcome.used_fallback is True
    assert [x.agent_id for x in outcome.plan.selected_agents] == [9]
    assert "planner_retry_failed" in caplog.text
    assert "fallback_plan_executed" in caplog.text

@pytest.mark.anyio
async def test_planner_uses_runtime_provider_key_override() -> None:
    fake = FakeCompletion(
        [
            """
            {
              "plan_id": "planner-3",
              "selected_agents": [{"agent_id": 5, "priority": 90, "reason_tag": "mention"}],
              "execution_graph": [{"stage": 1, "mode": "serial", "agents": [5]}],
              "round_control": {"max_rounds": 1, "trigger_next_round": false, "next_round_candidates": []}
            }
            """
        ]
    )

    client = PlannerClient(
        completion_fn=fake,
        hard_cap=5,
        retry_count=1,
        planner_model="qwen-plus",
        planner_api_key="",
        planner_api_base=None,
        timeout_ms=2500,
    )

    outcome = await client.plan(
        conversation_id=11,
        trigger_message_id=22,
        message_content="hello",
        active_agent_ids=[5],
        mentioned_ids=[5],
        is_group=True,
        planner_api_key="runtime-key",
        planner_api_base="https://dashscope.aliyuncs.com/compatible-mode/v1",
    )

    assert outcome.used_fallback is False
    assert [x.agent_id for x in outcome.plan.selected_agents] == [5]


def test_failure_type_classifies_type_errors_as_json_invalid() -> None:
    exc = TypeError("'int' object is not subscriptable")
    assert PlannerClient._failure_type(exc) == "json_invalid"


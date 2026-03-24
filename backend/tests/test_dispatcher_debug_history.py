from app.api.v1.endpoints import get_dispatcher_debug_history
from app.modules.im.application.dispatcher_debug_history import (
    DispatcherDebugHistoryStore,
)


def test_dispatcher_debug_history_endpoint_returns_recent_entries(monkeypatch) -> None:
    history_store = DispatcherDebugHistoryStore(max_entries_per_conversation=10)
    history_store.append(
        tenant_id="local",
        conversation_id=7,
        payload={
            "type": "summary",
            "created_at": "2026-03-19T10:00:00Z",
            "message_id": 200,
            "selected_agents": [3],
            "fallback": False,
            "failure_type": None,
            "retry_count": 0,
            "latency_ms": 120,
            "planner_output_preview": '{"plan_id":"older"}',
            "plan": {
                "plan_id": "older",
                "selected_agents": [
                    {"agent_id": 3, "priority": 100, "reason_tag": "mention"}
                ],
                "execution_graph": [{"stage": 1, "mode": "serial", "agents": [3]}],
                "round_control": {
                    "max_rounds": 1,
                    "trigger_next_round": False,
                    "next_round_candidates": [],
                },
                "deferred_candidates": [],
            },
            "context": {
                "raw_content": "@Mike hi",
                "cleaned_content": "hi",
                "active_agent_ids": [3],
                "mentioned_ids": [3],
                "missing_mentioned_ids": [],
                "is_group": True,
            },
        },
    )
    history_store.append(
        tenant_id="local",
        conversation_id=7,
        payload={
            "type": "summary",
            "created_at": "2026-03-19T10:01:00Z",
            "message_id": 201,
            "selected_agents": [9],
            "fallback": True,
            "failure_type": "timeout",
            "retry_count": 1,
            "latency_ms": 220,
            "planner_output_preview": '{"plan_id":"newer"}',
            "plan": {
                "plan_id": "newer",
                "selected_agents": [
                    {"agent_id": 9, "priority": 100, "reason_tag": "fallback_host"}
                ],
                "execution_graph": [{"stage": 1, "mode": "serial", "agents": [9]}],
                "round_control": {
                    "max_rounds": 1,
                    "trigger_next_round": False,
                    "next_round_candidates": [],
                },
                "deferred_candidates": [],
            },
            "context": {
                "raw_content": "hello",
                "cleaned_content": "hello",
                "active_agent_ids": [9],
                "mentioned_ids": [],
                "missing_mentioned_ids": [],
                "is_group": True,
            },
        },
    )
    monkeypatch.setattr("app.api.v1.endpoints.dispatcher_debug_history_store", history_store)

    response = get_dispatcher_debug_history(conversation_id=7, limit=1)

    assert len(response["items"]) == 1
    assert response["items"][0]["message_id"] == 201
    assert response["items"][0]["failure_type"] == "timeout"
    assert response["items"][0]["planner_output_preview"] == '{"plan_id":"newer"}'

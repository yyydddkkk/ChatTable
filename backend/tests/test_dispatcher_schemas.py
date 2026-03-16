from app.modules.dispatcher.domain.schemas import (
    DispatchPlan,
    build_fallback_plan,
    compute_effective_cap,
    parse_dispatch_plan,
)


def test_compute_effective_cap_hard_limit() -> None:
    assert compute_effective_cap(hard_cap=5, active_agents_count=10) == 5
    assert compute_effective_cap(hard_cap=5, active_agents_count=3) == 3
    assert compute_effective_cap(hard_cap=5, active_agents_count=0) == 0


def test_parse_dispatch_plan_trims_selected_agents_by_cap() -> None:
    raw = {
        "plan_id": "p1",
        "selected_agents": [
            {"agent_id": 3, "priority": 50, "reason_tag": "x"},
            {"agent_id": 1, "priority": 100, "reason_tag": "mention"},
            {"agent_id": 2, "priority": 80, "reason_tag": "match"},
        ],
        "execution_graph": [
            {"stage": 1, "mode": "parallel", "agents": [1, 2, 3]}
        ],
        "round_control": {
            "max_rounds": 2,
            "trigger_next_round": False,
            "next_round_candidates": [],
        },
    }

    plan = parse_dispatch_plan(
        raw_plan=raw,
        conversation_id=100,
        trigger_message_id=200,
        effective_cap=2,
    )

    assert isinstance(plan, DispatchPlan)
    assert [item.agent_id for item in plan.selected_agents] == [1, 2]
    assert plan.execution_graph[0].agents == [1, 2]


def test_build_fallback_plan_with_mentions_prefers_mentioned_order() -> None:
    plan = build_fallback_plan(
        conversation_id=10,
        trigger_message_id=99,
        mentioned_ids=[5, 3],
        active_agent_ids=[1, 3, 5, 7],
    )

    assert [item.agent_id for item in plan.selected_agents] == [5, 3]
    assert plan.execution_graph[0].mode == "serial"
    assert plan.execution_graph[0].agents == [5, 3]


def test_build_fallback_plan_without_mentions_picks_first_active_agent() -> None:
    plan = build_fallback_plan(
        conversation_id=10,
        trigger_message_id=99,
        mentioned_ids=[],
        active_agent_ids=[7, 2, 9],
    )

    assert [item.agent_id for item in plan.selected_agents] == [7]
    assert plan.execution_graph[0].agents == [7]

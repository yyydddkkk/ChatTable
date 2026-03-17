from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import uuid4


@dataclass
class SelectedAgent:
    agent_id: int
    priority: int
    reason_tag: str


@dataclass
class ExecutionStage:
    stage: int
    mode: str
    agents: list[int]


@dataclass
class RoundControl:
    max_rounds: int
    trigger_next_round: bool
    next_round_candidates: list[int]


@dataclass
class DispatchPlan:
    plan_id: str
    conversation_id: int
    trigger_message_id: int
    selected_agents: list[SelectedAgent]
    execution_graph: list[ExecutionStage]
    round_control: RoundControl
    deferred_candidates: list[int]


def compute_effective_cap(hard_cap: int, active_agents_count: int) -> int:
    if hard_cap <= 0 or active_agents_count <= 0:
        return 0
    return min(hard_cap, active_agents_count)


def _to_selected_agent(raw: Any, index: int) -> SelectedAgent:
    if isinstance(raw, dict):
        agent_id = raw.get("agent_id", raw.get("id"))
        if agent_id is None:
            raise ValueError("selected_agent missing agent_id")
        priority = raw.get("priority", 100 - index)
        reason_tag = str(raw.get("reason_tag", "planner_selected"))
        return SelectedAgent(
            agent_id=int(agent_id),
            priority=int(priority),
            reason_tag=reason_tag,
        )

    # Some planner responses return selected_agents as a list of raw IDs.
    return SelectedAgent(
        agent_id=int(raw),
        priority=100 - index,
        reason_tag="planner_selected",
    )


def _to_execution_stage(raw: dict[str, Any]) -> ExecutionStage:
    agents = [int(agent_id) for agent_id in raw.get("agents", [])]
    return ExecutionStage(
        stage=int(raw.get("stage", 1)),
        mode=str(raw.get("mode", "parallel")),
        agents=agents,
    )


def parse_dispatch_plan(
    raw_plan: dict[str, Any],
    conversation_id: int,
    trigger_message_id: int,
    effective_cap: int,
) -> DispatchPlan:
    selected_raw = raw_plan.get("selected_agents", [])
    if not isinstance(selected_raw, list):
        raise ValueError("selected_agents must be a list")
    selected = [_to_selected_agent(item, index) for index, item in enumerate(selected_raw)]

    selected.sort(key=lambda item: item.priority, reverse=True)
    if effective_cap >= 0:
        selected = selected[:effective_cap]
    allowed_agent_ids = {item.agent_id for item in selected}

    execution_graph: list[ExecutionStage] = []
    for stage_data in raw_plan.get("execution_graph", []):
        stage = _to_execution_stage(stage_data)
        stage_agents = [agent_id for agent_id in stage.agents if agent_id in allowed_agent_ids]
        if not stage_agents:
            continue
        execution_graph.append(
            ExecutionStage(stage=stage.stage, mode=stage.mode, agents=stage_agents)
        )

    if not execution_graph and selected:
        execution_graph = [
            ExecutionStage(
                stage=1,
                mode="parallel",
                agents=[item.agent_id for item in selected],
            )
        ]

    round_control_data = raw_plan.get("round_control", {})
    round_control = RoundControl(
        max_rounds=min(int(round_control_data.get("max_rounds", 2)), 3),
        trigger_next_round=bool(round_control_data.get("trigger_next_round", False)),
        next_round_candidates=[
            int(agent_id) for agent_id in round_control_data.get("next_round_candidates", [])
        ],
    )

    deferred_candidates = [int(agent_id) for agent_id in raw_plan.get("deferred_candidates", [])]

    return DispatchPlan(
        plan_id=str(raw_plan.get("plan_id") or uuid4()),
        conversation_id=conversation_id,
        trigger_message_id=trigger_message_id,
        selected_agents=selected,
        execution_graph=execution_graph,
        round_control=round_control,
        deferred_candidates=deferred_candidates,
    )


def build_fallback_plan(
    conversation_id: int,
    trigger_message_id: int,
    mentioned_ids: list[int],
    active_agent_ids: list[int],
) -> DispatchPlan:
    ordered_mentioned = [agent_id for agent_id in mentioned_ids if agent_id in active_agent_ids]
    if ordered_mentioned:
        selected_ids = ordered_mentioned
        reason_tag = "fallback_mention"
    else:
        selected_ids = active_agent_ids[:1]
        reason_tag = "fallback_host"

    selected_agents = [
        SelectedAgent(
            agent_id=agent_id,
            priority=100 - idx,
            reason_tag=reason_tag,
        )
        for idx, agent_id in enumerate(selected_ids)
    ]

    execution_graph = [
        ExecutionStage(
            stage=1,
            mode="serial",
            agents=selected_ids,
        )
    ]

    return DispatchPlan(
        plan_id=f"fallback-{uuid4()}",
        conversation_id=conversation_id,
        trigger_message_id=trigger_message_id,
        selected_agents=selected_agents,
        execution_graph=execution_graph,
        round_control=RoundControl(
            max_rounds=1,
            trigger_next_round=False,
            next_round_candidates=[],
        ),
        deferred_candidates=[],
    )

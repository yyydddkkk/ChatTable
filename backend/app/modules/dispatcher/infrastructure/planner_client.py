from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Awaitable, Callable

import litellm

from app.core.config import get_logger, settings
from app.modules.dispatcher.domain.schemas import (
    DispatchPlan,
    build_fallback_plan,
    compute_effective_cap,
    parse_dispatch_plan,
)
from app.services.llm_service import normalize_api_base

logger = get_logger(__name__)

PlannerCompletionFn = Callable[..., Awaitable[str]]


@dataclass
class PlannerOutcome:
    plan: DispatchPlan
    used_fallback: bool
    failure_type: str | None
    retry_count: int


class PlannerClient:
    def __init__(
        self,
        completion_fn: PlannerCompletionFn | None = None,
        hard_cap: int | None = None,
        retry_count: int | None = None,
        planner_model: str | None = None,
        planner_api_key: str | None = None,
        planner_api_base: str | None = None,
        timeout_ms: int | None = None,
    ) -> None:
        self._completion_fn = completion_fn or self._default_completion
        self._hard_cap = hard_cap if hard_cap is not None else settings.dispatcher_hard_cap
        self._retry_count = (
            retry_count if retry_count is not None else settings.dispatcher_planner_retry
        )
        self._planner_model = planner_model or settings.dispatcher_planner_model
        self._planner_api_key = (
            planner_api_key
            if planner_api_key is not None
            else settings.dispatcher_planner_api_key
        )
        self._planner_api_base = (
            planner_api_base
            if planner_api_base is not None
            else settings.dispatcher_planner_api_base
        )
        self._timeout_ms = (
            timeout_ms if timeout_ms is not None else settings.dispatcher_planner_timeout_ms
        )

    async def plan(
        self,
        conversation_id: int,
        trigger_message_id: int,
        message_content: str,
        active_agent_ids: list[int],
        mentioned_ids: list[int],
        is_group: bool,
        planner_api_key: str | None = None,
        planner_api_base: str | None = None,
    ) -> PlannerOutcome:
        if not active_agent_ids:
            plan = build_fallback_plan(
                conversation_id=conversation_id,
                trigger_message_id=trigger_message_id,
                mentioned_ids=mentioned_ids,
                active_agent_ids=[],
            )
            return PlannerOutcome(
                plan=plan,
                used_fallback=True,
                failure_type="no_active_agents",
                retry_count=0,
            )

        effective_cap = compute_effective_cap(
            hard_cap=self._hard_cap,
            active_agents_count=len(active_agent_ids),
        )

        effective_api_key = (
            planner_api_key if planner_api_key is not None else self._planner_api_key
        )
        effective_api_base = (
            planner_api_base if planner_api_base is not None else self._planner_api_base
        )

        if not effective_api_key:
            logger.error(
                "planner_primary_failed event=planner_primary_failed failure_type=missing_api_key conversation_id=%s message_id=%s",
                conversation_id,
                trigger_message_id,
            )
            fallback_plan = build_fallback_plan(
                conversation_id=conversation_id,
                trigger_message_id=trigger_message_id,
                mentioned_ids=mentioned_ids,
                active_agent_ids=active_agent_ids,
            )
            logger.warning(
                "fallback_plan_executed event=fallback_plan_executed fallback_strategy=missing_api_key selected_agents=%s conversation_id=%s message_id=%s",
                [agent.agent_id for agent in fallback_plan.selected_agents],
                conversation_id,
                trigger_message_id,
            )
            return PlannerOutcome(
                plan=fallback_plan,
                used_fallback=True,
                failure_type="missing_api_key",
                retry_count=0,
            )

        prompt_messages = self._build_prompt(
            message_content=message_content,
            active_agent_ids=active_agent_ids,
            mentioned_ids=mentioned_ids,
            effective_cap=effective_cap,
            is_group=is_group,
        )

        last_failure_type = "unknown"
        max_attempts = 1 + max(0, self._retry_count)
        for attempt in range(max_attempts):
            try:
                raw_output = await self._completion_fn(
                    model=self._planner_model,
                    api_key=effective_api_key,
                    api_base=effective_api_base or None,
                    messages=prompt_messages,
                    timeout_ms=self._timeout_ms,
                )
                raw_json = self._extract_json(raw_output)
                raw_plan = json.loads(raw_json)
                plan = parse_dispatch_plan(
                    raw_plan=raw_plan,
                    conversation_id=conversation_id,
                    trigger_message_id=trigger_message_id,
                    effective_cap=effective_cap,
                )
                if not plan.selected_agents:
                    raise ValueError("planner returned empty selected_agents")

                return PlannerOutcome(
                    plan=plan,
                    used_fallback=False,
                    failure_type=None,
                    retry_count=attempt,
                )
            except Exception as exc:
                last_failure_type = self._failure_type(exc)
                event_name = (
                    "planner_primary_failed" if attempt == 0 else "planner_retry_failed"
                )
                logger.error(
                    "%s event=%s failure_type=%s retry_count=%s planner_model=%s conversation_id=%s message_id=%s",
                    event_name,
                    event_name,
                    last_failure_type,
                    attempt,
                    self._planner_model,
                    conversation_id,
                    trigger_message_id,
                )

        fallback_plan = build_fallback_plan(
            conversation_id=conversation_id,
            trigger_message_id=trigger_message_id,
            mentioned_ids=mentioned_ids,
            active_agent_ids=active_agent_ids,
        )
        logger.warning(
            "fallback_plan_executed event=fallback_plan_executed failure_type=%s fallback_strategy=minimal selected_agents=%s conversation_id=%s message_id=%s",
            last_failure_type,
            [agent.agent_id for agent in fallback_plan.selected_agents],
            conversation_id,
            trigger_message_id,
        )
        return PlannerOutcome(
            plan=fallback_plan,
            used_fallback=True,
            failure_type=last_failure_type,
            retry_count=max_attempts - 1,
        )

    @staticmethod
    def _failure_type(exc: Exception) -> str:
        exc_name = exc.__class__.__name__.lower()
        exc_text = str(exc).lower()
        if (
            isinstance(exc, TimeoutError)
            or "timeout" in exc_name
            or "timed out" in exc_text
        ):
            return "timeout"
        if isinstance(exc, (json.JSONDecodeError, ValueError, TypeError, KeyError)):
            return "json_invalid"
        return "network"

    @staticmethod
    def _extract_json(raw_output: str) -> str:
        text = raw_output.strip()
        if text.startswith("```"):
            lines = text.splitlines()
            if len(lines) >= 3:
                text = "\n".join(lines[1:-1]).strip()
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1 or start >= end:
            raise ValueError("planner output does not contain a json object")
        return text[start : end + 1]

    @staticmethod
    def _build_prompt(
        message_content: str,
        active_agent_ids: list[int],
        mentioned_ids: list[int],
        effective_cap: int,
        is_group: bool,
    ) -> list[dict[str, str]]:
        system_prompt = (
            "You are a dispatcher planner. Return a single JSON object only. "
            "Do not include markdown, explanation, or extra text."
        )
        user_prompt = (
            f"message: {message_content}\n"
            f"is_group: {is_group}\n"
            f"active_agent_ids: {active_agent_ids}\n"
            f"mentioned_ids: {mentioned_ids}\n"
            f"effective_cap: {effective_cap}\n"
            "Required JSON fields: plan_id, selected_agents, execution_graph, round_control."
        )
        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

    @staticmethod
    async def _default_completion(
        *,
        model: str,
        api_key: str,
        api_base: str | None,
        messages: list[dict[str, str]],
        timeout_ms: int,
    ) -> str:
        normalized_url, custom_provider = normalize_api_base(api_base)
        kwargs = {
            "model": model,
            "messages": messages,
            "api_key": api_key,
            "stream": False,
            "timeout": timeout_ms / 1000,
            # Disable nested SDK retries; Dispatcher already has explicit retry policy.
            "num_retries": 0,
        }
        if normalized_url:
            kwargs["api_base"] = normalized_url
        if custom_provider:
            kwargs["custom_llm_provider"] = custom_provider

        response = await litellm.acompletion(**kwargs)
        if response.choices and response.choices[0].message.content:
            return str(response.choices[0].message.content)
        raise ValueError("planner response has empty content")


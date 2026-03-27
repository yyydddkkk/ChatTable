from __future__ import annotations

import asyncio
from dataclasses import dataclass
from time import perf_counter
from typing import Any, Callable

from sqlmodel import Session, select

from app.core.config import get_logger, settings
from app.core.security import security_manager
from app.core.tenant import get_current_tenant_id
from app.core.websocket import ConnectionManager
from app.models.agent import Agent
from app.models.app_settings import AppSettings
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.provider import Provider
from app.modules.dispatcher.infrastructure.planner_client import PlannerClient
from app.modules.engine.application.ports import ChatEnginePort
from app.services.message_parser import get_conversation_agents, parse_mentions

logger = get_logger(__name__)


@dataclass
class MessageDispatchContext:
    conversation_id: int
    trigger_message_id: int
    cleaned_content: str
    active_agent_ids: list[int]
    active_provider_ids: list[int]
    mentioned_ids: list[int]
    is_group: bool


def resolve_planner_credentials(
    db: Session,
    active_provider_ids: list[int] | None = None,
) -> tuple[str | None, str | None, str, int | None]:
    if settings.dispatcher_planner_api_key:
        return (
            settings.dispatcher_planner_api_key,
            settings.dispatcher_planner_api_base or None,
            "env",
            None,
        )

    if db is None:
        return None, None, "missing", None

    tenant_id = get_current_tenant_id()
    candidates: list[tuple[str, int]] = []
    seen_ids: set[int] = set()

    app_settings = db.exec(
        select(AppSettings).where(AppSettings.tenant_id == tenant_id)
    ).first()
    if app_settings and app_settings.optimizer_provider_id:
        provider_id = int(app_settings.optimizer_provider_id)
        candidates.append(("optimizer_provider", provider_id))
        seen_ids.add(provider_id)

    for provider_id in active_provider_ids or []:
        pid = int(provider_id)
        if pid in seen_ids:
            continue
        candidates.append(("conversation_provider", pid))
        seen_ids.add(pid)

    if not candidates:
        latest_agent = db.exec(
            select(Agent)
            .where(
                Agent.tenant_id == tenant_id,
                Agent.provider_id.is_not(None),  # type: ignore[union-attr]
            )
            .order_by(Agent.updated_at.desc())  # type: ignore[union-attr]
            .limit(1)
        ).first()
        if latest_agent and latest_agent.provider_id is not None:
            candidates.append(("tenant_provider", int(latest_agent.provider_id)))

    for source, provider_id in candidates:
        provider = db.exec(
            select(Provider).where(
                Provider.id == provider_id,
                Provider.tenant_id == tenant_id,
            )
        ).first()
        if not provider:
            continue
        try:
            api_key = security_manager.decrypt(provider.api_key)
        except Exception:
            logger.error(
                "Failed to decrypt planner provider key: provider_id=%s",
                provider_id,
            )
            continue
        return api_key, (provider.api_base or None), source, provider_id

    return None, None, "missing", None


class DispatcherService:
    def __init__(
        self,
        engine: ChatEnginePort,
        planner_client: PlannerClient | None = None,
        context_loader: Callable[..., MessageDispatchContext | Any] | None = None,
    ) -> None:
        self._engine = engine
        self._planner_client = planner_client or PlannerClient()
        self._context_loader = context_loader or self._load_context

    async def handle_user_message(
        self,
        conversation_id: str,
        content: str,
        db: Session,
        ws_manager: ConnectionManager,
        conversation_lengths: dict[int, int],
    ) -> None:
        started = perf_counter()
        pre_saved_user_message_id: int | None = None
        context_result = self._context_loader(
            conversation_id=conversation_id,
            content=content,
            db=db,
        )
        if asyncio.iscoroutine(context_result):
            context = await context_result
        else:
            context = context_result

        trigger_message_id = context.trigger_message_id
        if db is not None:
            tenant_id = get_current_tenant_id()
            user_msg = Message(
                conversation_id=context.conversation_id,
                tenant_id=tenant_id,
                sender_type="user",
                content=content,
            )
            db.add(user_msg)
            db.commit()
            db.refresh(user_msg)
            pre_saved_user_message_id = user_msg.id
            trigger_message_id = user_msg.id if user_msg.id is not None else trigger_message_id

            await ws_manager.broadcast(
                {
                    "type": "user_message",
                    "message": {
                        "id": user_msg.id,
                        "content": content,
                        "sender_type": "user",
                        "created_at": user_msg.created_at.isoformat(),
                    },
                },
                conversation_id,
            )

        planner_api_key, planner_api_base = self._resolve_planner_credentials(
            db=db,
            context=context,
        )

        outcome = await self._planner_client.plan(
            conversation_id=context.conversation_id,
            trigger_message_id=trigger_message_id,
            message_content=context.cleaned_content,
            active_agent_ids=context.active_agent_ids,
            mentioned_ids=context.mentioned_ids,
            is_group=context.is_group,
            planner_api_key=planner_api_key,
            planner_api_base=planner_api_base,
        )

        if outcome.used_fallback and settings.dispatcher_debug_feedback:
            await ws_manager.broadcast(
                {
                    "type": "dispatcher_degraded",
                    "failure_type": outcome.failure_type,
                    "retry_count": outcome.retry_count,
                },
                conversation_id,
            )

        selected_agent_ids = [item.agent_id for item in outcome.plan.selected_agents]
        missing_mentioned_ids = [
            agent_id for agent_id in context.mentioned_ids if agent_id not in selected_agent_ids
        ]
        plan_payload = {
            "plan_id": outcome.plan.plan_id,
            "selected_agents": [
                {
                    "agent_id": item.agent_id,
                    "priority": item.priority,
                    "reason_tag": item.reason_tag,
                }
                for item in outcome.plan.selected_agents
            ],
            "execution_graph": [
                {
                    "stage": stage.stage,
                    "mode": stage.mode,
                    "agents": stage.agents,
                }
                for stage in outcome.plan.execution_graph
            ],
            "round_control": {
                "max_rounds": outcome.plan.round_control.max_rounds,
                "trigger_next_round": outcome.plan.round_control.trigger_next_round,
                "next_round_candidates": outcome.plan.round_control.next_round_candidates,
            },
            "deferred_candidates": outcome.plan.deferred_candidates,
        }
        context_payload = {
            "raw_content": content,
            "cleaned_content": context.cleaned_content,
            "active_agent_ids": context.active_agent_ids,
            "mentioned_ids": context.mentioned_ids,
            "missing_mentioned_ids": missing_mentioned_ids,
            "is_group": context.is_group,
        }
        latency_ms = int((perf_counter() - started) * 1000)

        if settings.dispatcher_debug_feedback:
            await ws_manager.broadcast(
                {
                    "type": "dispatcher_summary",
                    "conversation_id": context.conversation_id,
                    "message_id": trigger_message_id,
                    "selected_agents": selected_agent_ids,
                    "fallback": outcome.used_fallback,
                    "failure_type": outcome.failure_type,
                    "retry_count": outcome.retry_count,
                    "latency_ms": latency_ms,
                    "context": context_payload,
                    "plan": plan_payload,
                    "planner_output_preview": outcome.planner_output_preview,
                },
                conversation_id,
            )

        logger.info(
            "dispatch_summary event=dispatch_summary conversation_id=%s message_id=%s selected_agents=%s fallback=%s failure_type=%s retry_count=%s latency_ms=%d",
            context.conversation_id,
            trigger_message_id,
            selected_agent_ids,
            outcome.used_fallback,
            outcome.failure_type,
            outcome.retry_count,
            latency_ms,
        )

        await self._engine.process_user_message_with_plan(
            conversation_id=conversation_id,
            content=context.cleaned_content,
            plan=outcome.plan,
            pre_saved_user_message_id=pre_saved_user_message_id,
            db=db,
            ws_manager=ws_manager,
            conversation_lengths=conversation_lengths,
        )

    def _resolve_planner_credentials(
        self,
        db: Session,
        context: MessageDispatchContext,
    ) -> tuple[str | None, str | None]:
        api_key, api_base, _, _ = resolve_planner_credentials(
            db=db,
            active_provider_ids=context.active_provider_ids,
        )
        return api_key, api_base

    @staticmethod
    def _load_context(
        conversation_id: str,
        content: str,
        db: Session,
    ) -> MessageDispatchContext:
        conv_id = int(conversation_id)
        tenant_id = get_current_tenant_id()

        conversation = db.exec(
            select(Conversation).where(
                Conversation.id == conv_id,
                Conversation.tenant_id == tenant_id,
            )
        ).first()
        if not conversation:
            logger.warning("Conversation not found for dispatcher: %s", conversation_id)
            return MessageDispatchContext(
                conversation_id=conv_id,
                trigger_message_id=-1,
                cleaned_content=content,
                active_agent_ids=[],
                active_provider_ids=[],
                mentioned_ids=[],
                is_group=False,
            )

        agents = get_conversation_agents(db, conv_id)
        cleaned_content, mentioned_ids = parse_mentions(content, agents)

        latest_message = db.exec(
            select(Message)
            .where(
                Message.conversation_id == conv_id,
                Message.tenant_id == tenant_id,
            )
            .order_by(Message.id.desc())  # type: ignore[union-attr]
            .limit(1)
        ).first()
        trigger_message_id = (
            (latest_message.id + 1) if latest_message and latest_message.id else -1
        )

        active_provider_ids = [
            int(agent.provider_id)
            for agent in agents
            if agent.provider_id is not None
        ]

        return MessageDispatchContext(
            conversation_id=conv_id,
            trigger_message_id=trigger_message_id,
            cleaned_content=cleaned_content,
            active_agent_ids=[agent.id for agent in agents],
            active_provider_ids=active_provider_ids,
            mentioned_ids=mentioned_ids,
            is_group=conversation.type == "group",
        )


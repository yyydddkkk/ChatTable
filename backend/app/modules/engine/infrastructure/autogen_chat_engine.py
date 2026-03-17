import asyncio
import json
from datetime import datetime
from typing import Dict

from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.base import TaskResult
from autogen_agentchat.messages import ModelClientStreamingChunkEvent, TextMessage
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_ext.models.openai import OpenAIChatCompletionClient
from sqlmodel import Session, select

from app.core.cache import app_cache
from app.core.config import get_logger, settings
from app.core.decision_engine import decision_engine
from app.core.length_control import length_controller
from app.core.memory_manager import memory_manager
from app.core.redis_client import get_redis_client
from app.core.security import security_manager
from app.core.tenant import get_current_tenant_id
from app.core.topic_detector import topic_detector
from app.core.websocket import ConnectionManager
from app.models.agent import Agent
from app.models.autogen_checkpoint import AutogenCheckpoint
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.provider import Provider
from app.modules.dispatcher.domain.schemas import DispatchPlan, ExecutionStage
from app.modules.engine.application.ports import ChatEnginePort
from app.services.agent_service import AgentService
from app.services.llm_service import normalize_api_base
from app.services.message_parser import get_conversation_agents, parse_mentions

logger = get_logger(__name__)


class AutogenChatEngine(ChatEnginePort):
    """
    Phase-1 compatibility adapter.

    This class is the switch-point for AutoGen runtime integration.
    Current implementation keeps behavior stable by delegating to ChatHandler.
    """

    def __init__(self):
        self._lock_by_conversation: dict[int, asyncio.Lock] = {}
        self._state_by_conversation: dict[int, dict] = {}
        self._signature_by_conversation: dict[int, tuple[int, ...]] = {}

    async def clear_conversation(
        self,
        conversation_id: str,
        db: Session,
        ws_manager: ConnectionManager,
    ) -> None:
        conv_id = int(conversation_id)
        tenant_id = get_current_tenant_id()
        messages = db.exec(
            select(Message).where(
                Message.conversation_id == conv_id,
                Message.tenant_id == tenant_id,
            )
        ).all()
        for msg in messages:
            db.delete(msg)
        memory_manager.clear_all_memory(db, conv_id)
        db.commit()

        self._state_by_conversation.pop(conv_id, None)
        self._signature_by_conversation.pop(conv_id, None)
        self._lock_by_conversation.pop(conv_id, None)
        checkpoint = db.exec(
            select(AutogenCheckpoint).where(
                AutogenCheckpoint.conversation_id == conv_id,
                AutogenCheckpoint.tenant_id == tenant_id,
            )
        ).first()
        if checkpoint:
            db.delete(checkpoint)
            db.commit()
        self._mark_runtime_cleared(conv_id)

        await ws_manager.broadcast(
            {"type": "cleared", "message": "Chat history cleared"},
            conversation_id,
        )

    async def process_user_message(
        self,
        conversation_id: str,
        content: str,
        db: Session,
        ws_manager: ConnectionManager,
        conversation_lengths: Dict[int, int],
    ) -> None:
        conv_id = int(conversation_id)
        tenant_id = get_current_tenant_id()

        user_msg = Message(
            conversation_id=conv_id,
            tenant_id=tenant_id,
            sender_type="user",
            content=content,
        )
        db.add(user_msg)
        db.commit()
        db.refresh(user_msg)

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

        conversation = db.exec(
            select(Conversation).where(
                Conversation.id == conv_id,
                Conversation.tenant_id == tenant_id,
            )
        ).first()
        if not conversation:
            logger.warning("Conversation not found: %s", conversation_id)
            return

        is_group = conversation.type == "group"
        agents = get_conversation_agents(db, conv_id)
        if not agents:
            logger.debug("No active agents in conversation %s", conversation_id)
            return

        for agent in agents:
            memory_manager.add_message(db, conv_id, agent.id, user_msg)

        cleaned_content, mentioned_ids = parse_mentions(content, agents)

        current_length = conversation_lengths.get(conv_id, 3)
        trigger = length_controller.detect_trigger(cleaned_content)
        if trigger:
            current_length = max(1, min(5, current_length + trigger))
            conversation_lengths[conv_id] = current_length

        if topic_detector.detect_topic_switch(cleaned_content):
            await ws_manager.broadcast({"type": "topic_switched"}, conversation_id)

        replying_agents: list[Agent] = []
        has_mentions = len(mentioned_ids) > 0 and is_group
        if has_mentions:
            # Mentioned agents must all reply; do not apply probabilistic skip.
            for agent in agents:
                if agent.id in mentioned_ids:
                    replying_agents.append(agent)
        else:
            for agent in agents:
                decision = await decision_engine.should_reply(
                    agent=agent,
                    message=cleaned_content,
                    is_mentioned=False,
                    is_private=not is_group,
                )
                if decision.should_reply:
                    replying_agents.append(agent)

        if not replying_agents:
            return

        for agent in replying_agents:
            await ws_manager.broadcast(
                {"type": "agent_thinking", "agent_id": agent.id, "agent_name": agent.name},
                conversation_id,
            )

        lock = self._lock_by_conversation.setdefault(conv_id, asyncio.Lock())
        async with lock:
            if has_mentions:
                # Mentioned agents reply independently to avoid cross-agent hijacking.
                mentioned_rank = {
                    agent_id: idx for idx, agent_id in enumerate(mentioned_ids)
                }
                recent_user_context = self._build_recent_user_context(
                    db=db,
                    conversation_id=conv_id,
                    tenant_id=tenant_id,
                )
                replying_agents.sort(
                    key=lambda a: mentioned_rank.get(a.id, len(mentioned_rank))
                )
                for agent in replying_agents:
                    await self._run_team(
                        conversation_id=conversation_id,
                        db=db,
                        ws_manager=ws_manager,
                        agents=[agent],
                        content=self._build_direct_mention_task(
                            cleaned_content, agent.name, recent_user_context
                        ),
                        is_group=False,
                        length_level=current_length,
                        use_checkpoint=False,
                    )
            else:
                await self._run_team(
                    conversation_id=conversation_id,
                    db=db,
                    ws_manager=ws_manager,
                    agents=replying_agents,
                    content=cleaned_content,
                    is_group=is_group,
                    length_level=current_length,
                )


    async def process_user_message_with_plan(
        self,
        conversation_id: str,
        content: str,
        plan: DispatchPlan,
        pre_saved_user_message_id: int | None,
        db: Session,
        ws_manager: ConnectionManager,
        conversation_lengths: Dict[int, int],
    ) -> None:
        conv_id = int(conversation_id)
        tenant_id = get_current_tenant_id()

        user_msg: Message | None = None
        if pre_saved_user_message_id is not None:
            user_msg = db.exec(
                select(Message).where(
                    Message.id == pre_saved_user_message_id,
                    Message.conversation_id == conv_id,
                    Message.tenant_id == tenant_id,
                    Message.sender_type == "user",
                )
            ).first()

        if user_msg is None:
            user_msg = Message(
                conversation_id=conv_id,
                tenant_id=tenant_id,
                sender_type="user",
                content=content,
            )
            db.add(user_msg)
            db.commit()
            db.refresh(user_msg)

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

        conversation = db.exec(
            select(Conversation).where(
                Conversation.id == conv_id,
                Conversation.tenant_id == tenant_id,
            )
        ).first()
        if not conversation:
            logger.warning("Conversation not found: %s", conversation_id)
            return

        is_group = conversation.type == "group"
        agents = get_conversation_agents(db, conv_id)
        if not agents:
            logger.debug("No active agents in conversation %s", conversation_id)
            return

        for agent in agents:
            memory_manager.add_message(db, conv_id, agent.id, user_msg)

        cleaned_content, _ = parse_mentions(content, agents)

        current_length = conversation_lengths.get(conv_id, 3)
        trigger = length_controller.detect_trigger(cleaned_content)
        if trigger:
            current_length = max(1, min(5, current_length + trigger))
            conversation_lengths[conv_id] = current_length

        if topic_detector.detect_topic_switch(cleaned_content):
            await ws_manager.broadcast({"type": "topic_switched"}, conversation_id)

        agent_by_id = {agent.id: agent for agent in agents}
        selected_ids = [item.agent_id for item in plan.selected_agents]
        selected_agents = [
            agent_by_id[agent_id] for agent_id in selected_ids if agent_id in agent_by_id
        ]
        if not selected_agents:
            logger.info(
                "Dispatcher plan selected no active agents for conversation %s", conversation_id
            )
            return

        for agent in selected_agents:
            await ws_manager.broadcast(
                {"type": "agent_thinking", "agent_id": agent.id, "agent_name": agent.name},
                conversation_id,
            )

        stages = sorted(plan.execution_graph, key=lambda stage: stage.stage)
        if not stages:
            stages = [
                ExecutionStage(
                    stage=1,
                    mode="parallel",
                    agents=[agent.id for agent in selected_agents],
                )
            ]

        lock = self._lock_by_conversation.setdefault(conv_id, asyncio.Lock())
        async with lock:
            for stage in stages:
                stage_agents = [
                    agent_by_id[agent_id]
                    for agent_id in stage.agents
                    if agent_id in agent_by_id
                ]
                if not stage_agents:
                    continue

                mode = (stage.mode or "parallel").lower()
                if mode == "serial":
                    for agent in stage_agents:
                        await self._run_team(
                            conversation_id=conversation_id,
                            db=db,
                            ws_manager=ws_manager,
                            agents=[agent],
                            content=cleaned_content,
                            is_group=False,
                            length_level=current_length,
                            use_checkpoint=False,
                        )
                    continue

                # Parallel stage means independently generating replies for each
                # selected agent to avoid cross-agent response contamination.
                for agent in stage_agents:
                    await self._run_team(
                        conversation_id=conversation_id,
                        db=db,
                        ws_manager=ws_manager,
                        agents=[agent],
                        content=cleaned_content,
                        is_group=False,
                        length_level=current_length,
                        use_checkpoint=False,
                    )

    async def _run_team(
        self,
        conversation_id: str,
        db: Session,
        ws_manager: ConnectionManager,
        agents: list[Agent],
        content: str,
        is_group: bool,
        length_level: int,
        use_checkpoint: bool = True,
    ) -> None:
        conv_id = int(conversation_id)
        tenant_id = get_current_tenant_id()
        source_to_agent_id: dict[str, int] = {}
        model_clients: list[OpenAIChatCompletionClient] = []
        partial_by_agent: dict[int, str] = {}
        pending_by_agent: dict[int, str] = {}
        max_turns = len(agents) * (2 if is_group and len(agents) >= 2 else 1)
        signature = tuple(sorted(a.id for a in agents))
        batch_size = max(1, settings.stream_chunk_batch_chars)
        flush_punctuations = ("\n", ".", "!", "?", "。", "！", "？")

        try:
            async def flush_pending_chunk(agent_id: int) -> None:
                pending = pending_by_agent.get(agent_id, "")
                if not pending:
                    return
                await ws_manager.broadcast(
                    {
                        "type": "agent_message_chunk",
                        "agent_id": agent_id,
                        "content": pending,
                    },
                    conversation_id,
                )
                pending_by_agent[agent_id] = ""

            participants: list[AssistantAgent] = []
            for agent in agents:
                client = self._build_model_client(db, agent)
                model_clients.append(client)

                system_prompt = AgentService.build_system_prompt(agent, is_group=is_group)
                length_prompt = length_controller.get_length_prompt(length_level)
                final_system_prompt = f"{system_prompt}\n\n{length_prompt}"
                source_name = f"agent_{agent.id}"
                source_to_agent_id[source_name] = agent.id

                participants.append(
                    AssistantAgent(
                        name=source_name,
                        model_client=client,
                        system_message=final_system_prompt,
                        model_client_stream=True,
                    )
                )

            team = RoundRobinGroupChat(
                participants,
                max_turns=max(1, max_turns),
            )

            if use_checkpoint:
                previous_signature, previous_state = self._load_checkpoint(db, conv_id)
                if previous_state and previous_signature == signature:
                    await team.load_state(previous_state)

            stream = team.run_stream(
                task=TextMessage(content=content, source="user"),
            )
            async for message in stream:
                if isinstance(message, TaskResult):
                    continue

                source = getattr(message, "source", "")
                agent_id = source_to_agent_id.get(source)
                if not agent_id:
                    continue

                if isinstance(message, ModelClientStreamingChunkEvent):
                    chunk = str(message.content or "")
                    if chunk:
                        partial_by_agent[agent_id] = partial_by_agent.get(agent_id, "") + chunk
                        pending_by_agent[agent_id] = pending_by_agent.get(agent_id, "") + chunk
                        should_flush = len(pending_by_agent[agent_id]) >= batch_size or chunk.endswith(
                            flush_punctuations
                        )
                        if should_flush:
                            await flush_pending_chunk(agent_id)
                    continue

                if isinstance(message, TextMessage):
                    text = str(message.content or "").strip()
                    if text and agent_id not in partial_by_agent:
                        partial_by_agent[agent_id] = text

            for agent in agents:
                await flush_pending_chunk(agent.id)

            if use_checkpoint:
                saved_state = await team.save_state()
                self._save_checkpoint(
                    db=db,
                    conversation_id=conv_id,
                    signature=signature,
                    state=saved_state,
                )
                self._mark_runtime_active(conv_id)

            for agent in agents:
                full_response = partial_by_agent.get(agent.id, "").strip()
                if not full_response:
                    await ws_manager.broadcast(
                        {
                            "type": "agent_done",
                            "agent_id": agent.id,
                            "message": None,
                        },
                        conversation_id,
                    )
                    continue

                agent_msg = Message(
                    conversation_id=conv_id,
                    tenant_id=tenant_id,
                    sender_type="agent",
                    sender_id=agent.id,
                    content=full_response,
                )
                db.add(agent_msg)
                db.commit()
                db.refresh(agent_msg)

                await ws_manager.broadcast(
                    {
                        "type": "agent_done",
                        "agent_id": agent.id,
                        "message": {
                            "id": agent_msg.id,
                            "content": full_response,
                            "sender_type": "agent",
                            "sender_id": agent.id,
                            "created_at": agent_msg.created_at.isoformat(),
                        },
                    },
                    conversation_id,
                )
        except Exception as exc:
            logger.error("Autogen team run failed: %s", exc, exc_info=True)
            for agent in agents:
                await ws_manager.broadcast(
                    {
                        "type": "agent_done",
                        "agent_id": agent.id,
                        "error": True,
                        "error_message": f"Agent {agent.name} error: {str(exc)}",
                        "message": None,
                    },
                    conversation_id,
                )
        finally:
            for client in model_clients:
                try:
                    await client.close()
                except Exception:
                    pass

    @staticmethod
    def _build_direct_mention_task(
        content: str, agent_name: str, recent_user_context: str
    ) -> str:
        context_block = (
            f"最近用户消息（按时间从旧到新）:\n{recent_user_context}\n\n"
            if recent_user_context
            else ""
        )
        return (
            f"{context_block}"
            f"{content}\n\n"
            f"附加规则（必须遵守）:\n"
            f"1) 你只能以“{agent_name}”身份回答。\n"
            f"2) 不要替其他角色发言，不要点评其他角色的身份。\n"
            f"3) 优先依据“最近用户消息”中的事实回答用户问题。\n"
            f"4) 不要输出思考过程、推理步骤或内部分析。\n"
            f"5) 仅输出你的最终回答内容。"
        )

    @staticmethod
    def _build_recent_user_context(
        db: Session, conversation_id: int, tenant_id: str, limit: int = 8
    ) -> str:
        rows = db.exec(
            select(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.tenant_id == tenant_id,
                Message.sender_type == "user",
            )
            .order_by(Message.created_at.desc())
            .limit(limit)
        ).all()
        if not rows:
            return ""
        lines = [f"- {row.content}" for row in reversed(rows)]
        return "\n".join(lines)

    def _build_model_client(self, db: Session, agent: Agent) -> OpenAIChatCompletionClient:
        if not agent.provider_id:
            raise ValueError(f"Agent {agent.name} is missing provider config")
        tenant_id = get_current_tenant_id()

        cache_key = f"provider:{tenant_id}:{agent.provider_id}"
        provider_data = app_cache.get(cache_key)
        if provider_data is None:
            provider = db.exec(
                select(Provider).where(
                    Provider.id == agent.provider_id,
                    Provider.tenant_id == tenant_id,
                )
            ).first()
            if not provider:
                raise ValueError(f"Provider {agent.provider_id} not found")
            provider_data = {"api_key": provider.api_key, "api_base": provider.api_base}
            app_cache.set(cache_key, provider_data, ttl=120)

        api_key = security_manager.decrypt(provider_data["api_key"])
        normalized_url, _ = normalize_api_base(provider_data.get("api_base"))

        return OpenAIChatCompletionClient(
            model=agent.model,
            api_key=api_key,
            base_url=normalized_url,
            model_info={
                "vision": False,
                "function_calling": True,
                "json_output": True,
                "family": "unknown",
                "structured_output": True,
            },
        )

    def _load_checkpoint(self, db: Session, conversation_id: int) -> tuple[tuple[int, ...] | None, dict | None]:
        tenant_id = get_current_tenant_id()
        row = db.exec(
            select(AutogenCheckpoint).where(
                AutogenCheckpoint.conversation_id == conversation_id,
                AutogenCheckpoint.tenant_id == tenant_id,
            )
        ).first()
        if not row:
            return None, None

        try:
            signature = tuple(int(x) for x in row.agent_signature.split(",") if x)
            state = json.loads(row.state_json)
            return signature, state
        except Exception:
            logger.warning("Invalid checkpoint payload for conversation_id=%s", conversation_id)
            return None, None

    def _save_checkpoint(
        self,
        db: Session,
        conversation_id: int,
        signature: tuple[int, ...],
        state: dict,
    ) -> None:
        row = db.exec(
            select(AutogenCheckpoint).where(
                AutogenCheckpoint.conversation_id == conversation_id,
                AutogenCheckpoint.tenant_id == get_current_tenant_id(),
            )
        ).first()
        signature_str = ",".join(str(x) for x in signature)
        state_json = json.dumps(state, ensure_ascii=False)
        if row is None:
            row = AutogenCheckpoint(
                conversation_id=conversation_id,
                tenant_id=get_current_tenant_id(),
                agent_signature=signature_str,
                state_json=state_json,
                updated_at=datetime.now(),
            )
        else:
            row.agent_signature = signature_str
            row.state_json = state_json
            row.updated_at = datetime.now()

        db.add(row)
        db.commit()

    def _mark_runtime_active(self, conversation_id: int) -> None:
        redis_client = get_redis_client()
        if redis_client is None:
            return
        key = f"autogen:conversation:{conversation_id}:runtime"
        try:
            redis_client.set(key, "active", ex=3600)
        except Exception:
            logger.debug("Failed to set redis runtime key for conversation=%s", conversation_id)

    def _mark_runtime_cleared(self, conversation_id: int) -> None:
        redis_client = get_redis_client()
        if redis_client is None:
            return
        key = f"autogen:conversation:{conversation_id}:runtime"
        try:
            redis_client.delete(key)
        except Exception:
            logger.debug("Failed to clear redis runtime key for conversation=%s", conversation_id)



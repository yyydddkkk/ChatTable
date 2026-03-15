"""Chat handler extracted from WebSocket logic."""

import asyncio
import re
from typing import Dict

from sqlmodel import Session, select

from app.core.autonomous_coordination import (
    AutonomousSettings,
    SpeakerSelector,
    TerminationPolicy,
)
from app.core.cache import app_cache
from app.core.config import get_logger
from app.core.decision_engine import decision_engine
from app.core.length_control import length_controller
from app.core.memory_manager import memory_manager
from app.core.topic_detector import topic_detector
from app.core.websocket import ConnectionManager
from app.models.agent import Agent
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.provider import Provider
from app.services.agent_service import AgentService
from app.services.llm_service import llm_service
from app.services.message_parser import get_conversation_agents, parse_mentions

logger = get_logger(__name__)


class ChatHandler:
    """Handles all chat message processing extracted from the WebSocket endpoint."""

    def __init__(self) -> None:
        self._autonomous_settings = AutonomousSettings()

    async def handle_clear(
        self,
        conversation_id: str,
        db: Session,
        ws_manager: ConnectionManager,
    ) -> None:
        """Clear all messages and memory for a conversation."""
        logger.info("Clearing conversation %s", conversation_id)
        messages = db.exec(
            select(Message).where(Message.conversation_id == int(conversation_id))
        ).all()
        for msg in messages:
            db.delete(msg)

        memory_manager.clear_all_memory(db, int(conversation_id))
        db.commit()

        await ws_manager.broadcast(
            {"type": "cleared", "message": "Chat history cleared"},
            conversation_id,
        )

    async def handle_user_message(
        self,
        conversation_id: str,
        content: str,
        db: Session,
        ws_manager: ConnectionManager,
        conversation_lengths: Dict[int, int],
    ) -> None:
        """Save user message, run decision engine, orchestrate agent replies."""
        logger.info("User message in conversation %s: %s...", conversation_id, content[:50])

        user_msg = Message(
            conversation_id=int(conversation_id),
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

        conversation = db.get(Conversation, int(conversation_id))
        if not conversation:
            logger.warning("Conversation not found: %s", conversation_id)
            return

        is_group = conversation.type == "group"
        agents = get_conversation_agents(db, int(conversation_id))
        logger.debug("Found %d agents in conversation", len(agents))

        for agent in agents:
            memory_manager.add_message(db, int(conversation_id), agent.id, user_msg)

        cleaned_content, mentioned_ids = parse_mentions(content, agents)

        current_length = conversation_lengths.get(int(conversation_id), 3)
        trigger = length_controller.detect_trigger(cleaned_content)
        if trigger:
            current_length = max(1, min(5, current_length + trigger))
            conversation_lengths[int(conversation_id)] = current_length
            logger.debug("Length adjusted by %s, new level: %s", trigger, current_length)

        if topic_detector.detect_topic_switch(cleaned_content):
            logger.info("Topic switch detected in conversation %s", conversation_id)
            await ws_manager.broadcast({"type": "topic_switched"}, conversation_id)

        replying_agents: list[Agent] = []
        has_mentions = len(mentioned_ids) > 0 and is_group
        for agent in agents:
            is_mentioned = agent.id in mentioned_ids
            if has_mentions and not is_mentioned:
                continue

            decision = await decision_engine.should_reply(
                agent=agent,
                message=cleaned_content,
                is_mentioned=is_mentioned,
                is_private=not is_group,
            )
            if decision.should_reply:
                replying_agents.append(agent)
                logger.info(
                    "Agent %s will reply: %s (confidence: %.2f)",
                    agent.name,
                    decision.reason,
                    decision.confidence,
                )

        if not replying_agents:
            logger.debug("No agents will reply in conversation %s", conversation_id)
            return

        for agent in replying_agents:
            await self._send_thinking(ws_manager, conversation_id, agent)

        tasks = [
            self.stream_agent_reply(
                agent=agent,
                conversation_id=conversation_id,
                content=cleaned_content,
                db=db,
                ws_manager=ws_manager,
                is_group=is_group,
                replying_agents=replying_agents,
                length_level=current_length,
            )
            for agent in replying_agents
        ]
        await asyncio.gather(*tasks)

        if is_group and len(replying_agents) >= 2:
            await self._run_autonomous_dialogue(
                agents=replying_agents,
                conversation_id=conversation_id,
                seed_message=cleaned_content,
                db=db,
                ws_manager=ws_manager,
                length_level=current_length,
            )

    async def _run_autonomous_dialogue(
        self,
        agents: list[Agent],
        conversation_id: str,
        seed_message: str,
        db: Session,
        ws_manager: ConnectionManager,
        length_level: int,
    ) -> None:
        """Run autonomous speaker-to-speaker rounds until a termination condition is met."""
        selector = SpeakerSelector(decision_engine)
        policy = TerminationPolicy(self._autonomous_settings)

        round_index = 0
        empty_streak = 0
        last_speaker_id: int | None = None
        current_speaker = selector.pick_initial(agents, seed_message)
        stop_reason = "max_rounds"

        while current_speaker is not None:
            if policy.reached_round_limit(round_index):
                break

            await ws_manager.broadcast(
                {
                    "type": "autonomous_round_start",
                    "round": round_index + 1,
                    "speaker_id": current_speaker.id,
                    "speaker_name": current_speaker.name,
                },
                conversation_id,
            )
            await self._send_thinking(ws_manager, conversation_id, current_speaker)

            debate_context = self._build_debate_context(
                db=db,
                conversation_id=int(conversation_id),
                current_agent_id=current_speaker.id,
                agents=agents,
                seed_message=seed_message,
            )

            produced = await self.stream_agent_reply(
                agent=current_speaker,
                conversation_id=conversation_id,
                content=debate_context,
                db=db,
                ws_manager=ws_manager,
                is_group=True,
                replying_agents=agents,
                length_level=length_level,
                is_debate=True,
            )

            if not produced:
                empty_streak += 1
                if policy.reached_empty_limit(empty_streak):
                    stop_reason = "empty_streak"
                    break
            else:
                empty_streak = 0
                latest = self._get_latest_agent_reply(
                    db=db,
                    conversation_id=int(conversation_id),
                    agent_id=current_speaker.id,
                )
                if latest and policy.has_stop_keyword(latest.content):
                    stop_reason = "stop_keyword"
                    break

            round_index += 1
            last_speaker_id = current_speaker.id
            current_speaker = selector.pick_next(agents, previous_agent_id=last_speaker_id)

        await ws_manager.broadcast(
            {
                "type": "autonomous_ended",
                "reason": stop_reason,
                "rounds": round_index,
            },
            conversation_id,
        )

    @staticmethod
    def _get_latest_agent_reply(db: Session, conversation_id: int, agent_id: int) -> Message | None:
        return db.exec(
            select(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.sender_type == "agent",
                Message.sender_id == agent_id,
            )
            .order_by(Message.id.desc())  # type: ignore[union-attr]
            .limit(1)
        ).first()

    def _build_debate_context(
        self,
        db: Session,
        conversation_id: int,
        current_agent_id: int,
        agents: list[Agent],
        seed_message: str,
    ) -> str:
        recent_messages = db.exec(
            select(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.sender_type == "agent",
            )
            .order_by(Message.id.desc())  # type: ignore[union-attr]
            .limit(8)
        ).all()

        if not recent_messages:
            return f"Debate task: {seed_message}"

        lines: list[str] = []
        for msg in reversed(recent_messages):
            if msg.sender_id == current_agent_id:
                continue
            lines.append(f"{self._agent_name(agents, msg.sender_id or 0)}: {msg.content}")

        if not lines:
            return "Continue the discussion from your own perspective."

        return (
            "Latest discussion context:\n"
            + "\n".join(lines[-4:])
            + "\nRespond with your next debate turn. Use TERMINATE if consensus is reached."
        )

    @staticmethod
    def _agent_name(agents: list[Agent], agent_id: int) -> str:
        for agent in agents:
            if agent.id == agent_id:
                return agent.name
        return str(agent_id)

    @staticmethod
    async def _send_thinking(
        ws_manager: ConnectionManager,
        conversation_id: str,
        agent: Agent,
    ) -> None:
        await ws_manager.broadcast(
            {
                "type": "agent_thinking",
                "agent_id": agent.id,
                "agent_name": agent.name,
            },
            conversation_id,
        )

    async def stream_agent_reply(
        self,
        agent: Agent,
        conversation_id: str,
        content: str,
        db: Session,
        ws_manager: ConnectionManager,
        is_group: bool,
        replying_agents: list[Agent],
        length_level: int,
        is_debate: bool = False,
    ) -> bool:
        """Stream reply for a single agent. Returns True if a substantive reply was produced."""
        try:
            cache_key = f"provider:{agent.provider_id}"
            provider_data = app_cache.get(cache_key) if agent.provider_id else None
            if provider_data is None and agent.provider_id:
                provider = db.get(Provider, agent.provider_id)
                if provider:
                    provider_data = {"api_key": provider.api_key, "api_base": provider.api_base}
                    app_cache.set(cache_key, provider_data, ttl=120)

            if not provider_data:
                await ws_manager.broadcast(
                    {
                        "type": "agent_done",
                        "agent_id": agent.id,
                        "error": True,
                        "error_message": f"Agent {agent.name} has no provider configured",
                        "message": None,
                    },
                    conversation_id,
                )
                return False

            api_key = provider_data["api_key"]
            api_base = provider_data["api_base"] or None
            full_response = ""

            system_prompt = AgentService.build_system_prompt(agent, is_group=is_group)
            if is_debate:
                system_prompt += (
                    "\n\n[Debate Mode] Respond to other agents' points with agreement, refinement, or rebuttal. "
                    "Stay in character and concise. If debate should stop, include TERMINATE."
                )
                llm_messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": content},
                ]
            else:
                agent_content = content
                if is_group:
                    for other in replying_agents:
                        if other.id != agent.id:
                            agent_content = agent_content.replace(other.name, "").strip()
                    agent_content = re.sub(r"\s+", " ", agent_content).strip()

                history_messages = memory_manager.build_messages_context(
                    db, int(conversation_id), agent.id
                )
                llm_messages = [{"role": "system", "content": system_prompt}]
                llm_messages.extend(history_messages)
                llm_messages.append({"role": "user", "content": agent_content})

            llm_messages = length_controller.inject_length_prompt(llm_messages, length_level)

            async for chunk in llm_service.generate_stream(
                model=agent.model,
                api_key=api_key,
                messages=llm_messages,
                api_base=api_base,
            ):
                full_response += chunk
                await ws_manager.broadcast(
                    {
                        "type": "agent_message_chunk",
                        "agent_id": agent.id,
                        "content": chunk,
                    },
                    conversation_id,
                )

            stripped = full_response.strip()
            trivial_replies = {"(nod)", "pass", "..."}
            if is_debate and (len(stripped) < 5 or stripped.lower() in trivial_replies):
                logger.info("Agent %s returned trivial debate reply: %s", agent.name, stripped)
                await ws_manager.broadcast(
                    {
                        "type": "agent_done",
                        "agent_id": agent.id,
                        "message": None,
                    },
                    conversation_id,
                )
                return False

            agent_msg = Message(
                conversation_id=int(conversation_id),
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
            return True
        except Exception as exc:
            logger.error("Agent %s error: %s", agent.name, str(exc), exc_info=True)
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
            return False


chat_handler = ChatHandler()

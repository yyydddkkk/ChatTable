from collections.abc import Callable, Sequence

from sqlmodel import Session

from app.core.tenant import get_current_tenant_id
from app.core.websocket import ConnectionManager
from app.models.message import Message
from app.modules.agents.application.agent_runtime_service import AgentRuntimeService
from app.modules.agents.domain.agent_event import AgentEvent
from app.modules.agents.domain.reply_task import ReplyTask
from app.modules.agents.domain.speak_intent import SpeakIntent
from app.services.message_parser import get_conversation_agents


class ConversationOrchestrator:
    def __init__(
        self,
        runtime_service: AgentRuntimeService,
        active_agent_loader: Callable[..., Sequence[object]] | None = None,
    ) -> None:
        self._runtime_service = runtime_service
        self._active_agent_loader = active_agent_loader or get_conversation_agents

    async def handle_user_message(
        self,
        conversation_id: str,
        content: str,
        db: Session,
        ws_manager: ConnectionManager,
    ) -> None:
        tenant_id = get_current_tenant_id()
        user_msg = Message(
            conversation_id=int(conversation_id),
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

        agents = self._active_agent_loader(db, int(conversation_id))
        agent_ids = [agent.id for agent in agents if getattr(agent, "id", None) is not None]
        event = AgentEvent(
            event_id=f"conversation:{conversation_id}:message:{user_msg.id}",
            conversation_id=int(conversation_id),
            agent_id=None,
            event_type="conversation_message",
            content=content,
            metadata={"message_id": user_msg.id, "sender_type": "user"},
        )
        await self._runtime_service.broadcast(
            conversation_id=conversation_id,
            event=event,
            agent_ids=agent_ids,
        )

    @staticmethod
    def build_reply_tasks(
        intents: Sequence[SpeakIntent],
        *,
        max_speakers: int = 3,
    ) -> list[ReplyTask]:
        base_delays = [0, 800, 2000]
        selected = list(intents)[: max(0, max_speakers)]
        tasks: list[ReplyTask] = []
        for index, intent in enumerate(selected, start=1):
            default_delay = base_delays[index - 1] if index <= len(base_delays) else base_delays[-1]
            tasks.append(
                ReplyTask(
                    task_id=f"reply:{intent.event_id}:{intent.agent_id}:{index}",
                    agent_id=intent.agent_id,
                    conversation_id=intent.conversation_id,
                    event_id=intent.event_id,
                    turn_index=index,
                    start_after_ms=max(intent.suggested_delay_ms, default_delay),
                )
            )
        return tasks

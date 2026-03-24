from collections.abc import Sequence

from app.core.websocket import ConnectionManager
from app.modules.agents.application.agent_runtime_service import AgentRuntimeService
from app.modules.agents.application.conversation_orchestrator import (
    ConversationOrchestrator,
)
from app.modules.agents.application.reply_executor import ReplyExecutor
from app.modules.agents.application.speak_arbiter import SpeakArbiter
from app.modules.agents.domain.agent_definition import AgentDefinition
from app.modules.agents.domain.agent_event import AgentEvent
from app.modules.agents.infrastructure.intent_executor import IntentExecutor
from app.modules.agents.infrastructure.langgraph_runtime import LangGraphAgentRuntime
from app.modules.knowledge.rag_gateway import RAGGateway
from app.modules.skills.skill_registry import SkillRegistry
from app.modules.tools.mcp_gateway import MCPGateway


class DefaultAgentRuntimeService(AgentRuntimeService):
    def __init__(
        self,
        ws_manager: ConnectionManager | None = None,
        rag_gateway: RAGGateway | None = None,
        tool_gateway: MCPGateway | None = None,
        skill_gateway: SkillRegistry | None = None,
    ) -> None:
        self._ws_manager = ws_manager
        self._rag_gateway = rag_gateway or RAGGateway()
        self._tool_gateway = tool_gateway or MCPGateway()
        self._skill_gateway = skill_gateway or SkillRegistry()
        self._intent_executor = IntentExecutor()
        self._speak_arbiter = SpeakArbiter()
        self._reply_executor = ReplyExecutor()

    async def broadcast(
        self,
        *,
        conversation_id: str,
        event: AgentEvent,
        agent_ids: Sequence[int],
    ) -> None:
        if not agent_ids:
            return

        definitions = [
            AgentDefinition(agent_id=agent_id, name=f"Agent-{agent_id}", model="gpt-4o")
            for agent_id in agent_ids
        ]
        runtimes = [
            LangGraphAgentRuntime(
                definition=definition,
                rag_gateway=self._rag_gateway.retrieve,
                tool_gateway=self._tool_gateway.invoke,
                skill_gateway=self._skill_gateway.run,
            )
            for definition in definitions
        ]

        intents = await self._intent_executor.collect(runtimes, event)
        selected = self._speak_arbiter.select(intents, max_speakers=3)

        tasks = ConversationOrchestrator.build_reply_tasks(selected, max_speakers=3)

        runtime_by_id = {runtime._definition.agent_id: runtime for runtime in runtimes}

        async def _run_reply(task) -> None:
            runtime = runtime_by_id.get(task.agent_id)
            if runtime is None:
                return

            async def _on_chunk(chunk: str) -> None:
                if self._ws_manager is not None:
                    await self._ws_manager.broadcast(
                        {
                            "type": "agent_message_chunk",
                            "agent_id": task.agent_id,
                            "content": chunk,
                        },
                        conversation_id,
                    )

            await runtime.run_reply_path(
                task=task,
                event=event,
                on_chunk=_on_chunk,
            )

            if self._ws_manager is not None:
                await self._ws_manager.broadcast(
                    {
                        "type": "agent_done",
                        "agent_id": task.agent_id,
                        "conversation_id": int(conversation_id),
                    },
                    conversation_id,
                )

        await self._reply_executor.execute(
            tasks,
            runner=_run_reply,
            should_cancel=lambda _task: False,
        )

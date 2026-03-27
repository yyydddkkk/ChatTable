import asyncio
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from app.modules.agents.domain.agent_definition import AgentDefinition
from app.modules.agents.domain.agent_event import AgentEvent
from app.modules.agents.domain.reply_task import ReplyTask
from app.modules.agents.domain.speak_intent import SpeakIntent
from app.modules.knowledge.rag_gateway import RAGGateway
from app.modules.skills.skill_registry import SkillRegistry
from app.modules.tools.mcp_gateway import MCPGateway

StateLoader = Callable[[int], Any | Awaitable[Any]]
RelevanceScorer = Callable[[AgentDefinition, AgentEvent, Any], float | Awaitable[float]]
ContextLoader = Callable[[AgentDefinition, AgentEvent, ReplyTask], list[str] | Awaitable[list[str]]]
ResponseStreamer = Callable[[AgentDefinition, AgentEvent, ReplyTask, list[str]], AsyncIterator[str]]
MessagePersister = Callable[..., Any | Awaitable[Any]]
ChunkCallback = Callable[[str], Any | Awaitable[Any]]
CapabilityGateway = Callable[..., Any | Awaitable[Any]]


class IntentGraphState(TypedDict, total=False):
    event: AgentEvent
    agent_state: Any
    intent: SpeakIntent


class ReplyGraphState(TypedDict, total=False):
    task: ReplyTask
    event: AgentEvent
    context: list[str]
    on_chunk: ChunkCallback | None
    response: str


class LangGraphAgentRuntime:
    def __init__(
        self,
        definition: AgentDefinition,
        state_loader: StateLoader | None = None,
        relevance_scorer: RelevanceScorer | None = None,
        context_loader: ContextLoader | None = None,
        response_streamer: ResponseStreamer | None = None,
        message_persister: MessagePersister | None = None,
        rag_gateway: CapabilityGateway | None = None,
        tool_gateway: CapabilityGateway | None = None,
        skill_gateway: CapabilityGateway | None = None,
    ) -> None:
        self._definition = definition
        self._state_loader = state_loader or (lambda _agent_id: None)
        self._relevance_scorer = relevance_scorer or self._default_relevance_scorer
        self._context_loader = context_loader or self._default_context_loader
        self._response_streamer = response_streamer or self._default_response_streamer
        self._message_persister = message_persister or self._default_message_persister
        self._rag_gateway = rag_gateway or RAGGateway().retrieve
        self._tool_gateway = tool_gateway or MCPGateway().invoke
        self._skill_gateway = skill_gateway or SkillRegistry().run
        self._intent_graph = self._build_intent_graph()
        self._reply_graph = self._build_reply_graph()

    async def run_intent_path(self, event: AgentEvent) -> SpeakIntent:
        result = await self._intent_graph.ainvoke({"event": event})
        return result["intent"]

    async def run_reply_path(
        self,
        *,
        task: ReplyTask,
        event: AgentEvent,
        on_chunk: ChunkCallback | None = None,
    ) -> str:
        result = await self._reply_graph.ainvoke(
            {
                "task": task,
                "event": event,
                "on_chunk": on_chunk,
            }
        )
        return result["response"]

    def _build_intent_graph(self):
        graph = StateGraph(IntentGraphState)
        graph.add_node("build_intent", self._build_intent_node)
        graph.add_edge(START, "build_intent")
        graph.add_edge("build_intent", END)
        return graph.compile()

    def _build_reply_graph(self):
        graph = StateGraph(ReplyGraphState)
        graph.add_node("load_context", self._load_context_node)
        graph.add_node("load_capabilities", self._load_capabilities_node)
        graph.add_node("generate_reply", self._generate_reply_node)
        graph.add_edge(START, "load_context")
        graph.add_edge("load_context", "load_capabilities")
        graph.add_edge("load_capabilities", "generate_reply")
        graph.add_edge("generate_reply", END)
        return graph.compile()

    async def _build_intent_node(self, state: IntentGraphState) -> IntentGraphState:
        event = state["event"]
        agent_state = self._state_loader(self._definition.agent_id)
        agent_state = await self._maybe_await(agent_state)

        score = self._relevance_scorer(self._definition, event, agent_state)
        score = await self._maybe_await(score)
        normalized_score = self._normalize_score(score)

        return {
            "agent_state": agent_state,
            "intent": SpeakIntent(
                agent_id=self._definition.agent_id,
                conversation_id=event.conversation_id,
                event_id=event.event_id,
                want_to_speak=normalized_score >= 0.5,
                priority_score=normalized_score,
                confidence=normalized_score,
                reason_tag=self._reason_tag(normalized_score),
                topic_tags=self._topic_tags(event),
                estimated_cost="low",
            ),
        }

    async def _load_context_node(self, state: ReplyGraphState) -> ReplyGraphState:
        task = state["task"]
        event = state["event"]
        context = self._context_loader(self._definition, event, task)
        context = await self._maybe_await(context)
        return {"context": context}

    async def _load_capabilities_node(self, state: ReplyGraphState) -> ReplyGraphState:
        task = state["task"]
        event = state["event"]
        context = list(state.get("context", []))

        if task.allow_rag and self._definition.knowledge_sources:
            rag_items = self._rag_gateway(self._definition, event)
            context.extend(await self._maybe_await(rag_items))
        if task.allow_tools and self._definition.tools:
            tool_items = self._tool_gateway(self._definition, event, task)
            context.extend(await self._maybe_await(tool_items))
        if task.allow_skills and self._definition.skills:
            skill_items = self._skill_gateway(self._definition, event, task)
            context.extend(await self._maybe_await(skill_items))

        return {"context": context}

    async def _generate_reply_node(self, state: ReplyGraphState) -> ReplyGraphState:
        task = state["task"]
        event = state["event"]
        context = state.get("context", [])
        on_chunk = state.get("on_chunk")

        chunks: list[str] = []
        async for chunk in self._response_streamer(self._definition, event, task, context):
            if not chunk:
                continue
            chunks.append(chunk)
            if on_chunk is not None:
                await self._maybe_await(on_chunk(chunk))

        response = "".join(chunks).strip()
        await self._maybe_await(self._message_persister(task=task, event=event, content=response))
        return {"response": response}

    @staticmethod
    async def _maybe_await(value: Any) -> Any:
        if asyncio.iscoroutine(value):
            return await value
        return value

    @staticmethod
    def _normalize_score(score: float) -> float:
        return max(0.0, min(1.0, float(score)))

    @staticmethod
    def _reason_tag(score: float) -> str:
        if score >= 0.75:
            return "high_relevance"
        if score >= 0.5:
            return "medium_relevance"
        return "low_relevance"

    @staticmethod
    def _topic_tags(event: AgentEvent) -> list[str]:
        words = [word.strip(".,!?") for word in event.content.split()]
        return [word for word in words if len(word) >= 4][:3]

    @staticmethod
    def _default_relevance_scorer(
        definition: AgentDefinition,
        event: AgentEvent,
        _state: Any,
    ) -> float:
        content = event.content.lower()
        name_hit = definition.name.lower() in content
        tag_hit = any(tag.lower() in content for tag in definition.tags)
        return 0.8 if name_hit or tag_hit else 0.3

    @staticmethod
    def _default_context_loader(
        _definition: AgentDefinition,
        _event: AgentEvent,
        _task: ReplyTask,
    ) -> list[str]:
        return []

    @staticmethod
    async def _default_response_streamer(
        definition: AgentDefinition,
        event: AgentEvent,
        _task: ReplyTask,
        _context: list[str],
    ) -> AsyncIterator[str]:
        yield f"{definition.name}: {event.content}"

    @staticmethod
    async def _default_message_persister(**_kwargs: Any) -> None:
        return None

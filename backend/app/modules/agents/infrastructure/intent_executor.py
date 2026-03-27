import asyncio
from collections.abc import Sequence

from app.modules.agents.domain.agent_event import AgentEvent
from app.modules.agents.domain.speak_intent import SpeakIntent
from app.modules.agents.infrastructure.langgraph_runtime import LangGraphAgentRuntime


class IntentExecutor:
    async def collect(
        self,
        runtimes: Sequence[LangGraphAgentRuntime],
        event: AgentEvent,
    ) -> list[SpeakIntent]:
        tasks = [runtime.run_intent_path(event) for runtime in runtimes]
        return list(await asyncio.gather(*tasks))

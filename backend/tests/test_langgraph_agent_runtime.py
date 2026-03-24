from types import SimpleNamespace

import pytest

from app.modules.agents.domain.agent_definition import AgentDefinition
from app.modules.agents.domain.agent_event import AgentEvent
from app.modules.agents.infrastructure.langgraph_runtime import LangGraphAgentRuntime


@pytest.mark.anyio
async def test_runtime_returns_speak_intent_for_group_event() -> None:
    runtime = LangGraphAgentRuntime(
        definition=AgentDefinition(agent_id=3, name="Mia", model="gpt-4o"),
        state_loader=lambda _agent_id: SimpleNamespace(
            cooldown_until=None,
            attention_topics=["movies"],
            relationship_strength=0.6,
        ),
        relevance_scorer=lambda _definition, event, _state: 0.92 if "movies" in event.content else 0.1,
    )

    intent = await runtime.run_intent_path(
        AgentEvent(
            event_id="evt-3",
            conversation_id=21,
            agent_id=None,
            event_type="conversation_message",
            content="let's talk about movies tonight",
        )
    )

    assert intent.want_to_speak is True
    assert intent.agent_id == 3
    assert intent.conversation_id == 21
    assert intent.priority_score == pytest.approx(0.92)
    assert intent.reason_tag == "high_relevance"

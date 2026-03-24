from app.modules.agents.domain.agent_event import AgentEvent
from app.modules.agents.domain.agent_state import AgentState
from app.modules.agents.domain.reply_task import ReplyTask
from app.modules.agents.domain.speak_intent import SpeakIntent


def test_speak_intent_defaults_are_stable() -> None:
    intent = SpeakIntent(
        agent_id=1,
        conversation_id=9,
        event_id="evt-1",
        want_to_speak=True,
        priority_score=0.8,
    )

    assert intent.suggested_delay_ms == 0
    assert intent.topic_tags == []
    assert intent.reason_tag == "unspecified"


def test_agent_event_and_state_defaults_are_usable() -> None:
    event = AgentEvent(
        event_id="evt-2",
        conversation_id=10,
        agent_id=2,
        event_type="conversation_message",
        content="hello",
    )
    state = AgentState(agent_id=2)
    task = ReplyTask(
        task_id="task-1",
        agent_id=2,
        conversation_id=10,
        event_id=event.event_id,
        turn_index=1,
    )

    assert event.metadata == {}
    assert state.attention_topics == []
    assert task.start_after_ms == 0

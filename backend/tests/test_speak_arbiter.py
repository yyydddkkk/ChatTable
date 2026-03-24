from app.modules.agents.application.speak_arbiter import SpeakArbiter
from app.modules.agents.domain.speak_intent import SpeakIntent


def test_arbiter_selects_top_three_non_duplicate_intents() -> None:
    arbiter = SpeakArbiter()
    intents = [
        SpeakIntent(agent_id=1, conversation_id=10, event_id="evt", want_to_speak=True, priority_score=0.95, duplicate_risk=0.05),
        SpeakIntent(agent_id=2, conversation_id=10, event_id="evt", want_to_speak=True, priority_score=0.91, duplicate_risk=0.10),
        SpeakIntent(agent_id=3, conversation_id=10, event_id="evt", want_to_speak=True, priority_score=0.89, duplicate_risk=0.15),
        SpeakIntent(agent_id=4, conversation_id=10, event_id="evt", want_to_speak=True, priority_score=0.92, duplicate_risk=0.85),
        SpeakIntent(agent_id=5, conversation_id=10, event_id="evt", want_to_speak=False, priority_score=0.99),
    ]

    selected = arbiter.select(intents, max_speakers=3)

    assert [intent.agent_id for intent in selected] == [1, 2, 3]


def test_arbiter_penalizes_cooldown_and_filters_duplicates() -> None:
    arbiter = SpeakArbiter(duplicate_threshold=0.7)
    intents = [
        SpeakIntent(agent_id=1, conversation_id=10, event_id="evt", want_to_speak=True, priority_score=0.80, cooldown_penalty=0.00, duplicate_risk=0.10),
        SpeakIntent(agent_id=2, conversation_id=10, event_id="evt", want_to_speak=True, priority_score=0.90, cooldown_penalty=0.25, duplicate_risk=0.10),
        SpeakIntent(agent_id=3, conversation_id=10, event_id="evt", want_to_speak=True, priority_score=0.88, cooldown_penalty=0.00, duplicate_risk=0.90),
    ]

    selected = arbiter.select(intents, max_speakers=2)

    assert [intent.agent_id for intent in selected] == [1, 2]

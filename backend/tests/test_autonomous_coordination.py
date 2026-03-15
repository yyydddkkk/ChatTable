from app.core.autonomous_coordination import (
    AutonomousSettings,
    SpeakerSelector,
    TerminationPolicy,
)
from app.core.decision_engine import DecisionEngine
from app.models.agent import Agent


def _agent(agent_id: int, name: str, skills: str | None = None, tags: str | None = None) -> Agent:
    return Agent(
        id=agent_id,
        name=name,
        model="gpt-4o",
        skills=skills,
        tags=tags,
    )


def test_pick_initial_prefers_relevance() -> None:
    selector = SpeakerSelector(DecisionEngine())
    agents = [
        _agent(1, "Joe", skills='["physics"]'),
        _agent(2, "Cathy", skills='["comedy", "joke"]'),
    ]

    picked = selector.pick_initial(agents, "tell me a joke")

    assert picked is not None
    assert picked.name == "Cathy"


def test_pick_next_round_robin() -> None:
    selector = SpeakerSelector(DecisionEngine())
    agents = [_agent(2, "Cathy"), _agent(1, "Joe"), _agent(3, "Max")]

    next_agent = selector.pick_next(agents, previous_agent_id=1)

    assert next_agent is not None
    assert next_agent.id == 2


def test_termination_policy_limits() -> None:
    policy = TerminationPolicy(
        AutonomousSettings(
            max_rounds=4,
            max_consecutive_empty_replies=2,
            stop_keywords=("TERMINATE",),
        )
    )

    assert policy.reached_round_limit(4) is True
    assert policy.reached_empty_limit(2) is True
    assert policy.has_stop_keyword("we should terminate now") is True

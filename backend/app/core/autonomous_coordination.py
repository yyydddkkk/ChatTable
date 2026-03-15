from dataclasses import dataclass

from app.core.decision_engine import DecisionEngine
from app.models.agent import Agent


@dataclass
class AutonomousSettings:
    max_rounds: int = 6
    max_consecutive_empty_replies: int = 2
    stop_keywords: tuple[str, ...] = ("TERMINATE", "[STOP_AUTONOMOUS]", "结束辩论")


class SpeakerSelector:
    """Pick which agent speaks next during autonomous debate."""

    def __init__(self, decision: DecisionEngine):
        self._decision = decision

    def pick_initial(self, agents: list[Agent], message: str) -> Agent | None:
        if not agents:
            return None
        ranked = sorted(
            agents,
            key=lambda agent: self._decision.calculate_relevance(agent, message),
            reverse=True,
        )
        return ranked[0]

    def pick_next(self, agents: list[Agent], previous_agent_id: int | None) -> Agent | None:
        if not agents:
            return None
        if previous_agent_id is None:
            return agents[0]

        sorted_agents = sorted(agents, key=lambda agent: (agent.id or 0, agent.name))
        for index, agent in enumerate(sorted_agents):
            if agent.id == previous_agent_id:
                return sorted_agents[(index + 1) % len(sorted_agents)]
        return sorted_agents[0]


class TerminationPolicy:
    """Terminate autonomous runs by deterministic conditions."""

    def __init__(self, settings: AutonomousSettings):
        self._settings = settings

    def reached_round_limit(self, round_index: int) -> bool:
        return round_index >= self._settings.max_rounds

    def reached_empty_limit(self, empty_streak: int) -> bool:
        return empty_streak >= self._settings.max_consecutive_empty_replies

    def has_stop_keyword(self, content: str) -> bool:
        upper_content = content.upper()
        for keyword in self._settings.stop_keywords:
            if keyword.upper() in upper_content:
                return True
        return False

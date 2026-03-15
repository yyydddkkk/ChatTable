import json
import random
from dataclasses import dataclass

from app.models.agent import Agent
from app.core.config import get_logger

logger = get_logger(__name__)


@dataclass
class ReplyDecision:
    should_reply: bool
    reason: str
    confidence: float


class DecisionEngine:
    """Local-only decision engine — no LLM calls."""

    def calculate_relevance(self, agent: Agent, message: str) -> float:
        """Pure local relevance scoring based on name/skills/tags matching."""
        msg_lower = message.lower()

        # Rule 1: message contains agent name → high relevance
        if agent.name and agent.name.lower() in msg_lower:
            return 0.9

        # Rule 2: skills/tags keyword matching
        keywords: list[str] = []
        for field in (agent.skills, agent.tags):
            if field:
                try:
                    items = json.loads(field)
                    if isinstance(items, list):
                        keywords.extend(str(k).lower() for k in items)
                except (json.JSONDecodeError, TypeError):
                    pass

        if keywords:
            matched = sum(1 for kw in keywords if kw in msg_lower)
            if matched > 0:
                ratio = matched / len(keywords)
                return 0.6 + min(ratio * 0.2, 0.2)  # 0.6 ~ 0.8

        # Rule 3: fallback to reply_probability
        return agent.reply_probability * 0.5

    async def should_reply(
        self,
        agent: Agent,
        message: str,
        is_mentioned: bool = False,
        is_private: bool = False,
    ) -> ReplyDecision:
        if is_mentioned or is_private:
            return ReplyDecision(
                should_reply=True, reason="mentioned_or_private", confidence=1.0
            )

        relevance = self.calculate_relevance(agent, message)

        if relevance > 0.7:
            return ReplyDecision(
                should_reply=True, reason="high_relevance", confidence=relevance
            )

        if relevance > 0.4:
            roll = random.random()
            if roll < agent.reply_probability:
                return ReplyDecision(
                    should_reply=True,
                    reason="probabilistic",
                    confidence=relevance * agent.reply_probability,
                )

        return ReplyDecision(
            should_reply=False, reason="low_relevance", confidence=relevance
        )


decision_engine = DecisionEngine()

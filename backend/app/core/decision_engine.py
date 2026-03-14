import random
import re
from dataclasses import dataclass

from sqlmodel import Session
from app.models.agent import Agent
from app.models.provider import Provider
from app.services.llm_service import llm_service
from app.core.database import engine
from app.core.config import get_logger

logger = get_logger(__name__)


@dataclass
class ReplyDecision:
    should_reply: bool
    reason: str
    confidence: float


class DecisionEngine:
    async def calculate_relevance(self, agent: Agent, message: str) -> float:
        prompt = f"你是一个判断助手。判断用户消息是否与 Agent 相关。Agent 角色: {agent.system_prompt}。用户消息: {message}。请判断相关度 (0-1)，只输出一个数字。"

        try:
            # Resolve provider credentials
            with Session(engine) as db:
                provider = db.get(Provider, agent.provider_id) if agent.provider_id else None
            if not provider:
                logger.warning(f"Agent {agent.name} has no provider, skipping relevance")
                return 0.5

            logger.debug(f"Calculating relevance for agent {agent.name}")
            response = await llm_service.generate(
                model=agent.model,
                api_key=provider.api_key,
                messages=[{"role": "user", "content": prompt}],
                api_base=provider.api_base,
            )

            match = re.search(r"0?\.\d+|\d", response)
            if match:
                value = float(match.group())
                relevance = max(0.0, min(1.0, value))
                logger.debug(f"Agent {agent.name} relevance: {relevance}")
                return relevance

        except Exception as e:
            logger.error(f"Relevance calculation error: {e}", exc_info=True)

        return 0.5

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

        relevance = await self.calculate_relevance(agent, message)

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

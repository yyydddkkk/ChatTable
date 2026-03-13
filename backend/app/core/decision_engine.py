import random
import re
from dataclasses import dataclass

from app.models.agent import Agent
from app.services.llm_service import llm_service
from app.core.security import security_manager


@dataclass
class ReplyDecision:
    should_reply: bool
    reason: str
    confidence: float


class DecisionEngine:
    async def calculate_relevance(self, agent: Agent, message: str) -> float:
        prompt = f"你是一个判断助手。判断用户消息是否与 Agent 相关。Agent 角色: {agent.system_prompt}。用户消息: {message}。请判断相关度 (0-1)，只输出一个数字。"

        decrypted_key = security_manager.decrypt(agent.api_key)

        try:
            response = await llm_service.generate_stream(
                model=agent.model,
                api_key=decrypted_key,
                messages=[{"role": "user", "content": prompt}],
                api_base=agent.api_base,
            )

            full_response = ""
            async for chunk in response:
                full_response += chunk

            match = re.search(r"0?\.\d+|\d", full_response)
            if match:
                value = float(match.group())
                return max(0.0, min(1.0, value))

        except Exception:
            pass

        return 0.5

    async def should_reply(
        self, agent: Agent, message: str, is_mentioned: bool = False
    ) -> ReplyDecision:
        if is_mentioned:
            return ReplyDecision(should_reply=True, reason="mentioned", confidence=1.0)

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

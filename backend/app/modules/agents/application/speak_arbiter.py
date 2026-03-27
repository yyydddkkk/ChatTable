from dataclasses import dataclass
from typing import Iterable

from app.modules.agents.domain.speak_intent import SpeakIntent


@dataclass(slots=True)
class SpeakArbiter:
    duplicate_threshold: float = 0.8

    def select(
        self,
        intents: Iterable[SpeakIntent],
        *,
        max_speakers: int = 3,
    ) -> list[SpeakIntent]:
        eligible = [intent for intent in intents if intent.want_to_speak]
        filtered = [
            intent for intent in eligible if intent.duplicate_risk < self.duplicate_threshold
        ]
        ranked = sorted(
            filtered,
            key=lambda intent: (
                -(intent.priority_score - intent.cooldown_penalty),
                intent.duplicate_risk,
                intent.suggested_delay_ms,
                intent.agent_id,
            ),
        )
        return ranked[: max(0, max_speakers)]

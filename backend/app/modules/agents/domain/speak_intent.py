from dataclasses import dataclass, field
from datetime import datetime


@dataclass(slots=True)
class SpeakIntent:
    agent_id: int
    conversation_id: int
    event_id: str
    want_to_speak: bool
    priority_score: float
    confidence: float = 0.0
    reason_tag: str = "unspecified"
    topic_tags: list[str] = field(default_factory=list)
    suggested_delay_ms: int = 0
    estimated_cost: str = "low"
    cooldown_penalty: float = 0.0
    duplicate_risk: float = 0.0
    generated_at: datetime = field(default_factory=datetime.utcnow)

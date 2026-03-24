from dataclasses import dataclass, field
from datetime import datetime


@dataclass(slots=True)
class AgentState:
    agent_id: int
    mood: str = "neutral"
    activity_level: float = 0.0
    cooldown_until: datetime | None = None
    attention_topics: list[str] = field(default_factory=list)
    relationship_strength: float = 0.0
    last_active_at: datetime | None = None

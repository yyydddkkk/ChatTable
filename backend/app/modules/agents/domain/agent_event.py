from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(slots=True)
class AgentEvent:
    event_id: str
    conversation_id: int
    agent_id: int | None
    event_type: str
    content: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = field(default_factory=dict)

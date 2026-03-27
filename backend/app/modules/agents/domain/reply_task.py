from dataclasses import dataclass


@dataclass(slots=True)
class ReplyTask:
    task_id: str
    agent_id: int
    conversation_id: int
    event_id: str
    turn_index: int
    reply_mode: str = "group_reply"
    start_after_ms: int = 0
    reply_budget: str = "normal"
    allow_rag: bool = False
    allow_tools: bool = False
    allow_skills: bool = False
    max_steps: int = 4
    cancel_if_stale: bool = True
    depends_on_agent_id: int | None = None

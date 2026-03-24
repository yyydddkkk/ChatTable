from dataclasses import dataclass, field


@dataclass(slots=True)
class AgentDefinition:
    agent_id: int
    name: str
    model: str
    system_prompt: str = "You are a helpful AI assistant."
    tools: list[str] = field(default_factory=list)
    skills: list[str] = field(default_factory=list)
    knowledge_sources: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)

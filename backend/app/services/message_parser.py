import re
import json
import ast
from typing import List, Tuple, Optional
from sqlmodel import Session, select
from app.models.agent import Agent
from app.models.conversation import Conversation
from app.core.tenant import get_current_tenant_id


def parse_mentions(content: str, agents: List[Agent]) -> Tuple[str, List[int]]:
    """
    Parse @ mentions from message content.
    Returns: (cleaned_content, list_of_mentioned_agent_ids)
    """
    mentioned_ids = []
    cleaned_content = content

    for agent in agents:
        # Match @AgentName pattern
        pattern = f"@{re.escape(agent.name)}"
        if re.search(pattern, content):
            mentioned_ids.append(agent.id)
            # Replace @name with just the name (keep it in the message)
            cleaned_content = re.sub(pattern, agent.name, cleaned_content)

    return cleaned_content, mentioned_ids


def get_conversation_agents(db: Session, conversation_id: int) -> List[Agent]:
    """Get all agents in a conversation"""
    tenant_id = get_current_tenant_id()
    conversation = db.exec(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.tenant_id == tenant_id,
        )
    ).first()
    if not conversation:
        return []

    try:
        member_ids = json.loads(conversation.members) if conversation.members else []
    except Exception:
        try:
            member_ids = ast.literal_eval(conversation.members) if conversation.members else []
        except Exception:
            member_ids = []

    if not isinstance(member_ids, list):
        member_ids = []

    if not member_ids:
        return []

    agents = []
    for agent_id in member_ids:
        agent = db.exec(
            select(Agent).where(
                Agent.id == agent_id,
                Agent.tenant_id == tenant_id,
            )
        ).first()
        if agent and agent.is_active:
            agents.append(agent)

    return agents


def should_agent_reply(agent: Agent, is_mentioned: bool, is_group_chat: bool) -> bool:
    """
    Determine if an agent should reply to a message.
    - In private chat: always reply
    - In group chat: only reply if mentioned
    """
    if not is_group_chat:
        return True

    return is_mentioned

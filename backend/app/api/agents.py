from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from datetime import datetime

from app.models.agent import Agent, AgentCreate, AgentUpdate, AgentResponse
from app.core.database import get_db
from app.core.security import security_manager

router = APIRouter(prefix="/api/v1/agents", tags=["agents"])


@router.get("", response_model=List[AgentResponse])
def list_agents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all agents"""
    agents = db.exec(select(Agent).offset(skip).limit(limit)).all()
    return agents


@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent(agent_id: int, db: Session = Depends(get_db)):
    """Get a single agent by ID"""
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.post("", response_model=AgentResponse)
def create_agent(agent_data: AgentCreate, db: Session = Depends(get_db)):
    """Create a new agent"""
    # Encrypt API key
    encrypted_api_key = security_manager.encrypt(agent_data.api_key)

    # Create agent
    agent = Agent(
        name=agent_data.name,
        avatar=agent_data.avatar,
        description=agent_data.description,
        model=agent_data.model,
        api_key=encrypted_api_key,
        api_base=agent_data.api_base,
        system_prompt=agent_data.system_prompt,
        response_speed=agent_data.response_speed,
        reply_probability=agent_data.reply_probability,
        default_length=agent_data.default_length,
        is_public=agent_data.is_public,
    )

    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


@router.patch("/{agent_id}", response_model=AgentResponse)
def update_agent(agent_id: int, agent_data: AgentUpdate, db: Session = Depends(get_db)):
    """Update an existing agent"""
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Update fields
    update_data = agent_data.model_dump(exclude_unset=True)

    # Encrypt API key if provided
    if "api_key" in update_data:
        update_data["api_key"] = security_manager.encrypt(update_data["api_key"])

    for field, value in update_data.items():
        setattr(agent, field, value)

    agent.updated_at = datetime.now()
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


@router.delete("/{agent_id}")
def delete_agent(agent_id: int, db: Session = Depends(get_db)):
    """Delete an agent"""
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    db.delete(agent)
    db.commit()
    return {"message": "Agent deleted successfully"}


@router.post("/{agent_id}/toggle-active", response_model=AgentResponse)
def toggle_agent_active(agent_id: int, db: Session = Depends(get_db)):
    """Toggle agent active status"""
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent.is_active = not agent.is_active
    agent.updated_at = datetime.now()
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent

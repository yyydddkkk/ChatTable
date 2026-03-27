from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from pydantic import BaseModel

from app.api.dependencies import get_db
from app.schemas.agent import AgentCreate, AgentUpdate, AgentResponse
from app.schemas.provider import ProviderCreate, ProviderUpdate, ProviderResponse
from app.schemas.conversation import ConversationCreate, ConversationResponse
from app.schemas.message import MessageResponse
from app.services.agent_service import agent_service
from app.services.conversation_service import conversation_service
from app.services.provider_service import provider_service
from app.models.app_settings import AppSettings
from app.core.audit import log_audit
from app.core.tenant import get_current_tenant_id
from app.modules.im.application.dispatcher_debug_history import (
    dispatcher_debug_history_store,
)

router = APIRouter()


# ── Agents ──────────────────────────────────────────────

@router.get("/agents", response_model=List[AgentResponse])
def list_agents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return agent_service.list_agents(db, skip, limit)


@router.get("/agents/{agent_id}", response_model=AgentResponse)
def get_agent(agent_id: int, db: Session = Depends(get_db)):
    agent = agent_service.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.post(
    "/agents", response_model=AgentResponse, status_code=status.HTTP_201_CREATED
)
def create_agent(agent_data: AgentCreate, db: Session = Depends(get_db)):
    return agent_service.create_agent(db, agent_data)


@router.patch("/agents/{agent_id}", response_model=AgentResponse)
def update_agent(agent_id: int, agent_data: AgentUpdate, db: Session = Depends(get_db)):
    agent = agent_service.update_agent(db, agent_id, agent_data)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.delete("/agents/{agent_id}")
def delete_agent(agent_id: int, db: Session = Depends(get_db)):
    deleted = agent_service.delete_agent(db, agent_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"message": "Agent deleted successfully"}


class OptimizePromptRequest(BaseModel):
    prompt: str


class GeneratePersonaRequest(BaseModel):
    description: str


@router.post("/agents/generate")
async def generate_persona_endpoint(req: GeneratePersonaRequest):
    from app.services.agent_service import AgentService

    try:
        data = await AgentService.generate_persona(description=req.description)
        return data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)}")


@router.post("/agents/optimize-prompt")
async def optimize_prompt_endpoint(req: OptimizePromptRequest):
    from app.services.prompt_optimizer import optimize_prompt

    try:
        optimized = await optimize_prompt(req.prompt)
        return {"optimized_prompt": optimized}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")


@router.post("/agents/{agent_id}/toggle-active", response_model=AgentResponse)
def toggle_agent_active(agent_id: int, db: Session = Depends(get_db)):
    agent = agent_service.toggle_active(db, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


# ── Providers ───────────────────────────────────────────

@router.get("/providers", response_model=List[ProviderResponse])
def list_providers(db: Session = Depends(get_db)):
    return provider_service.list_providers(db)


@router.post(
    "/providers", response_model=ProviderResponse, status_code=status.HTTP_201_CREATED
)
def create_provider(data: ProviderCreate, db: Session = Depends(get_db)):
    return provider_service.create_provider(db, data)


@router.patch("/providers/{provider_id}", response_model=ProviderResponse)
def update_provider(
    provider_id: int, data: ProviderUpdate, db: Session = Depends(get_db)
):
    provider = provider_service.update_provider(db, provider_id, data)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    return provider


@router.delete("/providers/{provider_id}")
def delete_provider(provider_id: int, db: Session = Depends(get_db)):
    deleted = provider_service.delete_provider(db, provider_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Provider not found")
    return {"message": "Provider deleted successfully"}


# ── App Settings ────────────────────────────────────────

class AppSettingsResponse(BaseModel):
    optimizer_provider_id: int | None = None
    optimizer_model: str = "qwen-plus"

    class Config:
        from_attributes = True


class AppSettingsUpdate(BaseModel):
    optimizer_provider_id: int | None = None
    optimizer_model: str | None = None


@router.get("/settings", response_model=AppSettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    tenant_id = get_current_tenant_id()
    settings = db.exec(
        select(AppSettings).where(AppSettings.tenant_id == tenant_id)
    ).first()
    if not settings:
        next_id = (db.exec(select(AppSettings.id).order_by(AppSettings.id.desc())).first() or 0) + 1
        settings = AppSettings(id=next_id, tenant_id=tenant_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.put("/settings", response_model=AppSettingsResponse)
def update_settings(data: AppSettingsUpdate, db: Session = Depends(get_db)):
    tenant_id = get_current_tenant_id()
    settings = db.exec(
        select(AppSettings).where(AppSettings.tenant_id == tenant_id)
    ).first()
    if not settings:
        next_id = (db.exec(select(AppSettings.id).order_by(AppSettings.id.desc())).first() or 0) + 1
        settings = AppSettings(id=next_id, tenant_id=tenant_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)
    db.add(settings)
    db.commit()
    db.refresh(settings)
    log_audit(
        db,
        action="settings.update",
        resource="app_settings",
        resource_id=str(settings.id),
        details={"fields": list(update_data.keys())},
    )
    db.commit()
    return settings


# ── Conversations ───────────────────────────────────────

@router.get("/conversations", response_model=List[ConversationResponse])
def list_conversations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return conversation_service.list_conversations(db, skip, limit)


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conversation = conversation_service.get_conversation(db, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_conversation(data: ConversationCreate, db: Session = Depends(get_db)):
    return conversation_service.create_conversation(db, data)


@router.get(
    "/conversations/{conversation_id}/messages", response_model=List[MessageResponse]
)
def get_messages(
    conversation_id: int, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)
):
    conversation = conversation_service.get_conversation(db, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation_service.get_messages(db, conversation_id, skip, limit)


@router.get("/conversations/{conversation_id}/dispatcher-history")
def get_dispatcher_debug_history(conversation_id: int, limit: int = 20):
    safe_limit = max(1, min(limit, 50))
    tenant_id = get_current_tenant_id()
    items = dispatcher_debug_history_store.list_recent(
        tenant_id=tenant_id,
        conversation_id=conversation_id,
        limit=safe_limit,
    )
    return {"items": items}

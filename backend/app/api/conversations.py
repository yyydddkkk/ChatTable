from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from datetime import datetime

from app.models.conversation import Conversation, ConversationCreate, ConversationResponse
from app.models.message import Message, MessageResponse
from app.core.database import get_db

router = APIRouter(prefix="/api/v1/conversations", tags=["conversations"])


@router.post("", response_model=ConversationResponse)
def create_conversation(data: ConversationCreate, db: Session = Depends(get_db)):
    """Create a new conversation"""
    conversation = Conversation(
        type=data.type,
        name=data.name,
        members=data.members,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


@router.get("", response_model=List[ConversationResponse])
def list_conversations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all conversations"""
    conversations = db.exec(select(Conversation).offset(skip).limit(limit)).all()
    return conversations


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    """Get a conversation by ID"""
    conversation = db.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation


@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
def get_messages(
    conversation_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get messages for a conversation"""
    conversation = db.get(Conversation, conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = db.exec(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .offset(skip)
        .limit(limit)
    ).all()
    return messages

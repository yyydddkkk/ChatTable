from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session
from app.core.config import settings
from app.core.websocket import manager
from app.core.database import init_db, engine
from app.api import agents, conversations
from app.models.message import Message
from app.models.agent import Agent
from app.services.llm_service import llm_service
from datetime import datetime
import json


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup: initialize database
    init_db()
    yield
    # Shutdown: cleanup if needed


app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(agents.router)
app.include_router(conversations.router)


@app.get("/")
async def root():
    return {"message": "ChatTable API"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    await manager.connect(websocket, conversation_id)
    try:
        while True:
            data = await websocket.receive_json()

            # Handle pong response
            if data.get("type") == "pong":
                continue

            # Handle user message
            if data.get("type") == "user_message":
                content = data.get("content", "")
                agent_id = data.get("agent_id")

                # Save user message
                with Session(engine) as db:
                    user_msg = Message(
                        conversation_id=int(conversation_id),
                        sender_type="user",
                        content=content,
                    )
                    db.add(user_msg)
                    db.commit()
                    db.refresh(user_msg)

                    # Broadcast user message
                    await manager.broadcast(
                        {
                            "type": "user_message",
                            "message": {
                                "id": user_msg.id,
                                "content": content,
                                "sender_type": "user",
                                "created_at": user_msg.created_at.isoformat(),
                            }
                        },
                        conversation_id,
                    )

                    # Get agent
                    agent = db.get(Agent, agent_id)
                    if not agent or not agent.is_active:
                        continue

                    # Send thinking status
                    await manager.broadcast(
                        {
                            "type": "agent_thinking",
                            "agent_id": agent.id,
                            "agent_name": agent.name,
                        },
                        conversation_id,
                    )

                    # Generate agent response
                    messages = [
                        {"role": "system", "content": agent.system_prompt},
                        {"role": "user", "content": content},
                    ]

                    full_response = ""
                    try:
                        async for chunk in llm_service.generate_stream(
                            model=agent.model,
                            api_key=agent.api_key,
                            messages=messages,
                            api_base=agent.api_base,
                        ):
                            full_response += chunk
                            await manager.broadcast(
                                {
                                    "type": "agent_message_chunk",
                                    "agent_id": agent.id,
                                    "content": chunk,
                                },
                                conversation_id,
                            )

                        # Save agent message
                        agent_msg = Message(
                            conversation_id=int(conversation_id),
                            sender_type="agent",
                            sender_id=agent.id,
                            content=full_response,
                        )
                        db.add(agent_msg)
                        db.commit()
                        db.refresh(agent_msg)

                        # Send done event
                        await manager.broadcast(
                            {
                                "type": "agent_done",
                                "agent_id": agent.id,
                                "message": {
                                    "id": agent_msg.id,
                                    "content": full_response,
                                    "sender_type": "agent",
                                    "sender_id": agent.id,
                                    "created_at": agent_msg.created_at.isoformat(),
                                }
                            },
                            conversation_id,
                        )
                    except Exception as e:
                        await manager.broadcast(
                            {
                                "type": "error",
                                "message": f"Agent error: {str(e)}",
                            },
                            conversation_id,
                        )

    except WebSocketDisconnect:
        manager.disconnect(websocket, conversation_id)

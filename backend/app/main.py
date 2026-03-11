from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.websocket import manager
from datetime import datetime

app = FastAPI(title=settings.app_name, debug=settings.debug)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

            # Echo message for testing
            await manager.broadcast({
                "type": "message",
                "content": data.get("content", ""),
                "timestamp": datetime.now().isoformat()
            }, conversation_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, conversation_id)


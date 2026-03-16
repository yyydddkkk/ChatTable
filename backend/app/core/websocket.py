import asyncio
from datetime import datetime
from typing import Dict, List

from fastapi import WebSocket

from app.core.config import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    def __init__(self):
        # conversation_id -> list of websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.heartbeat_tasks: Dict[WebSocket, asyncio.Task] = {}

    async def connect(self, websocket: WebSocket, conversation_id: str):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []
        self.active_connections[conversation_id].append(websocket)

        # Start heartbeat task
        task = asyncio.create_task(self._heartbeat(websocket))
        self.heartbeat_tasks[websocket] = task

        logger.info("WebSocket client connected: conversation_id=%s", conversation_id)

    def disconnect(self, websocket: WebSocket, conversation_id: str):
        if conversation_id in self.active_connections:
            self.active_connections[conversation_id].remove(websocket)
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]

        # Cancel heartbeat task
        if websocket in self.heartbeat_tasks:
            self.heartbeat_tasks[websocket].cancel()
            del self.heartbeat_tasks[websocket]

        logger.info("WebSocket client disconnected: conversation_id=%s", conversation_id)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast(self, message: dict, conversation_id: str):
        if conversation_id in self.active_connections:
            for connection in self.active_connections[conversation_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning("WebSocket broadcast failed: %s", e)

    async def _heartbeat(self, websocket: WebSocket):
        """Send ping every 30 seconds"""
        try:
            while True:
                await asyncio.sleep(30)
                await websocket.send_json({"type": "ping", "timestamp": datetime.now().isoformat()})
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.warning("WebSocket heartbeat failed: %s", e)


manager = ConnectionManager()

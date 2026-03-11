from typing import Dict, List
from fastapi import WebSocket
import asyncio
import json
from datetime import datetime


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

        print(f"Client connected to conversation {conversation_id}")

    def disconnect(self, websocket: WebSocket, conversation_id: str):
        if conversation_id in self.active_connections:
            self.active_connections[conversation_id].remove(websocket)
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]

        # Cancel heartbeat task
        if websocket in self.heartbeat_tasks:
            self.heartbeat_tasks[websocket].cancel()
            del self.heartbeat_tasks[websocket]

        print(f"Client disconnected from conversation {conversation_id}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast(self, message: dict, conversation_id: str):
        if conversation_id in self.active_connections:
            for connection in self.active_connections[conversation_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error broadcasting to client: {e}")

    async def _heartbeat(self, websocket: WebSocket):
        """Send ping every 30 seconds"""
        try:
            while True:
                await asyncio.sleep(30)
                await websocket.send_json({"type": "ping", "timestamp": datetime.now().isoformat()})
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"Heartbeat error: {e}")


manager = ConnectionManager()

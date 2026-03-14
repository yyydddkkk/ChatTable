import json
from typing import List
from sqlmodel import Session, select
from app.models.memory import ConversationMemory
from app.models.message import Message

MAX_WORKING_MEMORY = 20


class MemoryManager:
    """记忆管理器"""

    def get_memory(
        self, db: Session, conversation_id: int, agent_id: int
    ) -> ConversationMemory:
        """获取记忆"""
        memory = db.exec(
            select(ConversationMemory).where(
                ConversationMemory.conversation_id == conversation_id,
                ConversationMemory.agent_id == agent_id,
            )
        ).first()

        if not memory:
            memory = ConversationMemory(
                conversation_id=conversation_id,
                agent_id=agent_id,
                messages="[]",
                summary="",
            )
            db.add(memory)
            db.commit()
            db.refresh(memory)

        return memory

    def get_recent_messages(
        self, db: Session, conversation_id: int, limit: int = 20
    ) -> List[Message]:
        """获取最近消息"""
        messages = db.exec(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        ).all()
        return list(reversed(messages))

    def build_context(self, db: Session, conversation_id: int, agent_id: int) -> str:
        """构建上下文"""
        memory = self.get_memory(db, conversation_id, agent_id)

        if memory.summary:
            return f"之前对话摘要：{memory.summary}\n\n"

        messages = self.get_recent_messages(db, conversation_id, MAX_WORKING_MEMORY)
        if not messages:
            return ""

        context_parts = []
        for msg in messages:
            role = "用户" if msg.sender_type == "user" else "助手"
            context_parts.append(f"{role}: {msg.content}")

        return "对话历史：\n" + "\n".join(context_parts[-10:]) + "\n\n"

    def add_message(
        self, db: Session, conversation_id: int, agent_id: int, message: Message
    ):
        """添加消息到记忆"""
        memory = self.get_memory(db, conversation_id, agent_id)

        messages = json.loads(memory.messages)
        messages.append(
            {
                "id": message.id,
                "sender_type": message.sender_type,
                "content": message.content,
                "created_at": message.created_at.isoformat(),
            }
        )

        memory.messages = json.dumps(messages[-MAX_WORKING_MEMORY:])
        memory.updated_at = message.created_at
        db.add(memory)
        db.commit()

    def clear_memory(self, db: Session, conversation_id: int, agent_id: int):
        """清除指定 Agent 的记忆"""
        memory = db.exec(
            select(ConversationMemory).where(
                ConversationMemory.conversation_id == conversation_id,
                ConversationMemory.agent_id == agent_id,
            )
        ).first()
        if memory:
            memory.messages = "[]"
            memory.summary = ""
            db.add(memory)
            db.commit()

    def clear_all_memory(self, db: Session, conversation_id: int):
        """清除会话中所有 Agent 的记忆"""
        memories = db.exec(
            select(ConversationMemory).where(
                ConversationMemory.conversation_id == conversation_id,
            )
        ).all()
        for memory in memories:
            memory.messages = "[]"
            memory.summary = ""
            db.add(memory)
        db.commit()


memory_manager = MemoryManager()

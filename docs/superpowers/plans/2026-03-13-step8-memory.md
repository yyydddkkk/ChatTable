# Step 8: 记忆系统实现计划（简化版）

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan.

**Goal:** 实现工作记忆：保存最近消息 + 注入 LLM

**Architecture:** 创建 memory_manager.py 模块

**Tech Stack:** Python FastAPI, SQLModel

---

## Chunk 1: Memory 模型

### Files
- Create: `backend/app/models/memory.py`

- [ ] **Step 1: 创建 memory.py**

```python
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class ConversationMemory(SQLModel, table=True):
    __tablename__ = "conversation_memories"

    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="conversations.id")
    agent_id: int = Field(foreign_key="agents.id")
    messages: str = Field(default="[]")  # JSON string
    summary: str = Field(default="")
    updated_at: datetime = Field(default_factory=datetime.now)

    class Config:
        from_attributes = True
```

- [ ] **Step 2: 提交代码**

```bash
git add backend/app/models/memory.py
git commit -m "feat: add ConversationMemory model"
```

---

## Chunk 2: 记忆管理器

### Files
- Create: `backend/app/core/memory_manager.py`

- [ ] **Step 1: 创建 memory_manager.py**

```python
import json
from typing import List
from sqlmodel import Session, select
from app.models.memory import ConversationMemory
from app.models.message import Message
from app.services.llm_service import llm_service

MAX_WORKING_MEMORY = 20


class MemoryManager:
    """记忆管理器"""

    def get_memory(self, db: Session, conversation_id: int, agent_id: int) -> ConversationMemory:
        """获取记忆"""
        memory = db.exec(
            select(ConversationMemory).where(
                ConversationMemory.conversation_id == conversation_id,
                ConversationMemory.agent_id == agent_id
            )
        ).first()
        
        if not memory:
            memory = ConversationMemory(
                conversation_id=conversation_id,
                agent_id=agent_id,
                messages="[]",
                summary=""
            )
            db.add(memory)
            db.commit()
            db.refresh(memory)
        
        return memory

    def get_recent_messages(self, db: Session, conversation_id: int, limit: int = 20) -> List[Message]:
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

    def add_message(self, db: Session, conversation_id: int, agent_id: int, message: Message):
        """添加消息到记忆"""
        memory = self.get_memory(db, conversation_id, agent_id)
        
        messages = json.loads(memory.messages)
        messages.append({
            "id": message.id,
            "sender_type": message.sender_type,
            "content": message.content,
            "created_at": message.created_at.isoformat()
        })
        
        memory.messages = json.dumps(messages[-MAX_WORKING_MEMORY:])
        memory.updated_at = message.created_at
        db.add(memory)
        db.commit()


memory_manager = MemoryManager()
```

- [ ] **Step 2: 提交代码**

```bash
git add backend/app/core/memory_manager.py
git commit -m "feat: add memory manager module"
```

---

## Chunk 3: 集成到 WebSocket

### Files
- Modify: `backend/app/main.py`

- [ ] **Step 1: 导入记忆管理器**

```python
from app.core.memory_manager import memory_manager
```

- [ ] **Step 2: 修改 LLM 调用，注入记忆**

找到 messages 构建处，修改为:
```python
# 获取记忆上下文
memory_context = memory_manager.build_context(db, int(conversation_id), agent.id)
system_prompt = agent.system_prompt
if memory_context:
    system_prompt = f"{system_prompt}\n\n{memory_context}"

messages_with_length = length_controller.inject_length_prompt(
    [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": cleaned_content},
    ],
    current_length
)
```

- [ ] **Step 3: 保存消息到记忆**

在消息保存后添加:
```python
# 添加到记忆
memory_manager.add_message(db, int(conversation_id), agent.id, user_msg)
```

- [ ] **Step 4: 提交代码**

```bash
git add backend/app/main.py
git commit -m "feat: integrate memory into WebSocket"
```

---

## Chunk 4: 验证

### Files
- Test: 手动测试

- [ ] **Step 1: 前端构建**

```bash
cd frontend && npm run build
```

- [ ] **Step 2: 测试流程**

1. 发送多条消息
2. 观察 Agent 能否记住之前的对话

- [ ] **Step 3: 最终提交**

```bash
git add .
git commit -m "feat: complete Step 8 - memory system"
```

---

## 验收检查清单

- [ ] ConversationMemory 模型创建
- [ ] MemoryManager 创建
- [ ] WebSocket 集成
- [ ] 前端构建成功
- [ ] Git 提交

# Step 8: 记忆系统设计（简化版）

## 目标
实现工作记忆：保存最近消息 + 注入 LLM

## 数据模型

```python
class ConversationMemory:
    conversation_id: int
    agent_id: int
    messages: str  # JSON 字符串
    summary: str  # 压缩摘要
    updated_at: datetime
```

## 实现逻辑
1. 每次对话时加载历史消息
2. 超过 20 条时压缩为摘要
3. LLM 调用时注入记忆到 system prompt

## 文件变更

| 文件 | 职责 |
|------|------|
| `backend/app/models/memory.py` | Memory 模型 |
| `backend/app/core/memory_manager.py` | 记忆管理器 |

## 验收标准
- [ ] 消息历史保存到数据库
- [ ] LLM 调用时注入记忆
- [ ] 前端构建成功

# Step 5: 意愿计算层设计

## 目标
在群聊中，当消息没有 @ 特定 Agent 时，Agent 自主判断是否要回复

## 核心功能
1. **意愿计算** - 基于 response_probability 阈值
2. **话题相关度判断** - 使用 LLM 判断消息与 Agent 的相关性  
3. **回复决策** - 综合判断是否回复

## 判断逻辑

```
- 被 @ → 必须回复 (should_reply=True, reason="mentioned")
- 相关度 > 0.7 → 回复 (reason="high_relevance")
- 相关度 > 0.4 + random() < response_probability → 可能回复 (reason="probabilistic")
- 其他 → 不回复 (reason="low_relevance")
```

## LLM 判断 Prompt

```
你是一个判断助手。判断用户消息是否与 Agent 相关。
Agent 角色: {system_prompt}
用户消息: {message}
请判断相关度 (0-1)，只输出数字。
```

## 文件变更

| 文件 | 职责 |
|------|------|
| `backend/app/core/decision_engine.py` | 意愿计算核心逻辑 |
| `backend/app/main.py` | 集成决策引擎 |

## 验收标准
- [ ] 群聊中无 @ 时，相关 Agent 自动回复
- [ ] 不相关 Agent 不回复
- [ ] 前端构建成功

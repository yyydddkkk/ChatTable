# Step 5: 意愿计算层实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在群聊中实现 Agent 自主判断是否回复的功能

**Architecture:** 创建 decision_engine.py 封装意愿计算逻辑，在 WebSocket 处理中集成

**Tech Stack:** Python FastAPI, LiteLLM

---

## Chunk 1: 创建决策引擎核心

### Files
- Create: `backend/app/core/decision_engine.py`

- [ ] **Step 1: 创建 decision_engine.py**

```python
import random
from dataclasses import dataclass
from typing import Optional
from app.models.agent import Agent
from app.services.llm_service import llm_service


@dataclass
class ReplyDecision:
    should_reply: bool
    reason: str  # "mentioned", "high_relevance", "probabilistic", "low_relevance"
    confidence: float = 0.0


class DecisionEngine:
    """决策引擎：判断 Agent 是否应该回复"""

    async def should_reply(
        self,
        agent: Agent,
        message: str,
        is_mentioned: bool = False,
    ) -> ReplyDecision:
        """判断 Agent 是否应该回复"""
        
        # 被 @ 必须回复
        if is_mentioned:
            return ReplyDecision(
                should_reply=True,
                reason="mentioned",
                confidence=1.0,
            )

        # 计算相关度
        relevance = await self.calculate_relevance(agent, message)

        # 高相关度
        if relevance > 0.7:
            return ReplyDecision(
                should_reply=True,
                reason="high_relevance",
                confidence=relevance,
            )

        # 概率性回复
        threshold = 0.4 + (agent.response_probability or 0.5) * 0.6
        if relevance > threshold and random.random() < (agent.response_probability or 0.5):
            return ReplyDecision(
                should_reply=True,
                reason="probabilistic",
                confidence=relevance,
            )

        # 不回复
        return ReplyDecision(
            should_reply=False,
            reason="low_relevance",
            confidence=relevance,
        )

    async def calculate_relevance(self, agent: Agent, message: str) -> float:
        """使用 LLM 判断消息与 Agent 的相关度"""
        
        prompt = f"""你是一个判断助手。判断用户消息是否与 Agent 相关。
Agent 角色: {agent.system_prompt}
用户消息: {message}
请判断相关度 (0-1)，只输出一个数字。"""

        try:
            response = await llm_service.generate(
                model=agent.model,
                api_key=agent.api_key,
                messages=[{"role": "user", "content": prompt}],
                api_base=agent.api_base,
            )
            
            # 解析数字
            text = response.strip()
            # 提取数字
            import re
            match = re.search(r'0?\.?\d+', text)
            if match:
                value = float(match.group())
                return min(max(value, 0.0), 1.0)
            
        except Exception as e:
            print(f"Relevance calculation error: {e}")

        # 默认返回中等相关度
        return 0.5


# 全局实例
decision_engine = DecisionEngine()
```

- [ ] **Step 2: 添加 LLM non-stream 方法到 llm_service.py**

Modify: `backend/app/services/llm_service.py`

在 `generate_stream` 方法后添加:

```python
async def generate(
    self,
    model: str,
    api_key: str,
    messages: list,
    api_base: str | None = None,
) -> str:
    """Generate non-streaming response from LLM"""
    try:
        decrypted_key = security_manager.decrypt(api_key)

        kwargs = {
            "model": model,
            "messages": messages,
            "api_key": decrypted_key,
            "stream": False,
        }
        if api_base:
            kwargs["api_base"] = api_base

        response = await litellm.acompletion(**kwargs)
        
        if response.choices and response.choices[0].message.content:
            return response.choices[0].message.content
        
        return "0.5"  # 默认值
        
    except Exception as e:
        raise Exception(f"LLM error: {str(e)}")
```

- [ ] **Step 3: 提交代码**

```bash
git add backend/app/core/decision_engine.py backend/app/services/llm_service.py
git commit -m "feat: add decision engine for intent calculation"
```

---

## Chunk 2: 集成决策引擎到 WebSocket

### Files
- Modify: `backend/app/main.py`

- [ ] **Step 1: 导入决策引擎**

在文件顶部添加:
```python
from app.core.decision_engine import decision_engine
```

- [ ] **Step 2: 修改 WebSocket 逻辑，集成决策引擎**

找到现有的回复判断逻辑，替换为:

```python
# Determine which agents should reply
replying_agents = []
for agent in agents:
    is_mentioned = agent.id in mentioned_ids
    
    # 使用决策引擎判断
    decision = await decision_engine.should_reply(
        agent=agent,
        message=cleaned_content,
        is_mentioned=is_mentioned,
    )
    
    if decision.should_reply:
        replying_agents.append(agent)
        print(f"[Decision] Agent {agent.name}: {decision.reason} (confidence: {decision.confidence:.2f})")
```

- [ ] **Step 3: 提交代码**

```bash
git add backend/app/main.py
git commit -m "feat: integrate decision engine into WebSocket"
```

---

## Chunk 3: 测试和验证

### Files
- Test: 手动测试

- [ ] **Step 1: 前端构建检查**

```bash
cd frontend
npm run build
```

- [ ] **Step 2: 测试流程**

1. 启动后端: `cd backend && uv run uvicorn app.main:app --reload`
2. 启动前端: `cd frontend && npm run dev`
3. 创建 2 个 Agent
4. 创建群聊
5. 发送不含 @ 的消息，观察相关 Agent 是否回复

- [ ] **Step 3: 最终提交**

```bash
git add .
git commit -m "feat: complete Step 5 - intent calculation layer"
```

---

## 验收检查清单

- [ ] decision_engine.py 创建成功
- [ ] llm_service.py 添加 generate 方法
- [ ] WebSocket 集成决策引擎
- [ ] 前端构建成功
- [ ] Git 提交完成

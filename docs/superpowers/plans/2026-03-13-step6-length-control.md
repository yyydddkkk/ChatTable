# Step 6: 长度控制层实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan.

**Goal:** 实现五级长度控制 + 自然语言触发

**Architecture:** 创建 length_control.py 模块，在 WebSocket 中集成

**Tech Stack:** Python FastAPI, React

---

## Chunk 1: 后端长度控制模块

### Files
- Create: `backend/app/core/length_control.py`

- [ ] **Step 1: 创建 length_control.py**

```python
from typing import Optional

LENGTH_PROMPTS = {
    1: "请用一句话回答，最多 20 字。",
    2: "请简洁回答，50 字以内。",
    3: "请正常长度回答。",
    4: "请详细回答，充分说明。",
    5: "请尽可能详细地回答，包含所有细节。",
}

LENGTHEN_TRIGGERS = ["详细点", "多说点", "详细一些", "多说说", "展开说说"]
SHORTEN_TRIGGERS = ["简短点", "少说点", "简单说", "简洁点"]


class LengthController:
    """长度控制器"""

    def get_length_prompt(self, level: int) -> str:
        """获取长度提示"""
        level = max(1, min(5, level))
        return LENGTH_PROMPTS.get(level, LENGTH_PROMPTS[3])

    def detect_trigger(self, content: str) -> Optional[int]:
        """检测自然语言触发词"""
        content_lower = content.lower()
        
        for trigger in LENGTHEN_TRIGGERS:
            if trigger in content_lower:
                return 1  # 增加长度
        
        for trigger in SHORTEN_TRIGGERS:
            if trigger in content_lower:
                return -1  # 减少长度
        
        return None

    def inject_length_prompt(self, messages: list, length_level: int) -> list:
        """注入长度提示到消息"""
        length_prompt = self.get_length_prompt(length_level)
        
        new_messages = []
        for msg in messages:
            new_messages.append(msg)
            if msg.get("role") == "system":
                new_messages[-1] = {
                    "role": "system",
                    "content": msg["content"] + "\n\n" + length_prompt
                }
        
        if not any(m.get("role") == "system" for m in new_messages):
            new_messages.insert(0, {"role": "system", "content": length_prompt})
        
        return new_messages


length_controller = LengthController()
```

- [ ] **Step 2: 提交代码**

```bash
git add backend/app/core/length_control.py
git commit -m "feat: add length control module"
```

---

## Chunk 2: 集成到 WebSocket

### Files
- Modify: `backend/app/main.py`

- [ ] **Step 1: 导入长度控制器**

```python
from app.core.length_control import length_controller
```

- [ ] **Step 2: 添加会话长度状态**

在 websocket_endpoint 函数开始处添加:
```python
# 会话长度等级（默认3）
conversation_lengths: Dict[int, int] = {}
current_length = conversation_lengths.get(int(conversation_id), 3)
```

- [ ] **Step 3: 处理 set_length 消息**

在处理 pong 之后添加:
```python
# Handle set_length
if data.get("type") == "set_length":
    level = data.get("level", 3)
    level = max(1, min(5, level))
    conversation_lengths[int(conversation_id)] = level
    await manager.broadcast(
        {"type": "length_set", "level": level},
        conversation_id,
    )
    continue
```

- [ ] **Step 4: 修改 LLM 调用，注入长度提示**

找到 LLM 调用处，修改 messages:
```python
# 在调用 llm_service.generate_stream 之前
messages_with_length = length_controller.inject_length_prompt(
    [
        {"role": "system", "content": agent.system_prompt},
        {"role": "user", "content": cleaned_content},
    ],
    current_length
)
```

- [ ] **Step 5: 检测自然语言触发**

在发送消息后检测:
```python
# 检测触发词并调整长度
trigger = length_controller.detect_trigger(cleaned_content)
if trigger:
    current_length = max(1, min(5, current_length + trigger))
    conversation_lengths[int(conversation_id)] = current_length
```

- [ ] **Step 6: 提交代码**

```bash
git add backend/app/main.py
git commit -m "feat: integrate length control into WebSocket"
```

---

## Chunk 3: 前端长度调节器

### Files
- Create: `frontend/src/components/LengthAdjuster.tsx`

- [ ] **Step 1: 创建 LengthAdjuster.tsx**

```tsx
import { useState } from 'react';

interface LengthAdjusterProps {
  level: number;
  onChange: (level: number) => void;
}

const LEVELS = [
  { level: 1, label: '极短', icon: '●' },
  { level: 2, label: '较短', icon: '●●' },
  { level: 3, label: '中等', icon: '●●●' },
  { level: 4, label: '较长', icon: '●●●●' },
  { level: 5, label: '极长', icon: '●●●●●' },
];

export default function LengthAdjuster({ level, onChange }: LengthAdjusterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted">长度:</span>
      <div className="flex gap-1">
        {LEVELS.map((l) => (
          <button
            key={l.level}
            onClick={() => onChange(l.level)}
            className={`px-2 py-1 text-xs rounded transition ${
              level === l.level
                ? 'bg-primary text-white'
                : 'bg-background text-text-muted hover:bg-primary/10'
            }`}
            title={l.label}
          >
            {l.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 集成到 ChatPage**

Modify: `frontend/src/pages/ChatPage.tsx`

1. 导入组件:
```tsx
import LengthAdjuster from '../components/LengthAdjuster';
```

2. 添加状态:
```tsx
const [lengthLevel, setLengthLevel] = useState(3);
```

3. 在头部添加调节器（返回按钮旁边）

4. 处理 WebSocket 消息:
```tsx
} else if (data.type === 'length_set') {
  setLengthLevel(data.level);
}
```

5. 发送长度设置:
```tsx
ws.send(JSON.stringify({ type: 'set_length', level }));
```

- [ ] **Step 3: 提交代码**

```bash
git add frontend/src/components/LengthAdjuster.tsx frontend/src/pages/ChatPage.tsx
git commit -m "feat: add length adjuster UI"
```

---

## Chunk 4: 验证

### Files
- Test: 手动测试

- [ ] **Step 1: 前端构建**

```bash
cd frontend
npm run build
```

- [ ] **Step 2: 测试流程**

1. 启动后端和前端
2. 创建 Agent，进入私聊
3. 点击长度按钮，观察回复变化
4. 发送"详细点"，观察回复变长

- [ ] **Step 3: 最终提交**

```bash
git add .
git commit -m "feat: complete Step 6 - length control layer"
```

---

## 验收检查清单

- [ ] length_control.py 创建成功
- [ ] WebSocket 集成长度控制
- [ ] LengthAdjuster.tsx 组件创建
- [ ] ChatPage 集成调节器
- [ ] 前端构建成功
- [ ] Git 提交完成

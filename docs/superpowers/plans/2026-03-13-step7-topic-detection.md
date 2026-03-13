# Step 7: 话题检测实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development to implement this plan.

**Goal:** 实现硬话题切换检测

**Architecture:** 创建 topic_detector.py 模块

**Tech Stack:** Python FastAPI

---

## Chunk 1: 话题检测模块

### Files
- Create: `backend/app/core/topic_detector.py`

- [ ] **Step 1: 创建 topic_detector.py**

```python
TOPIC_SWITCH_KEYWORDS = [
    "换个话题",
    "换个谈资",
    "聊点别的",
    "我们聊",
    "来说说",
    "换个东西聊",
    "换一个话题",
]


class TopicDetector:
    """话题检测器"""

    def detect_topic_switch(self, content: str) -> bool:
        """检测是否话题切换"""
        content_lower = content.lower()
        
        for keyword in TOPIC_SWITCH_KEYWORDS:
            if keyword in content_lower:
                return True
        
        return False


topic_detector = TopicDetector()
```

- [ ] **Step 2: 提交代码**

```bash
git add backend/app/core/topic_detector.py
git commit -m "feat: add topic detector module"
```

---

## Chunk 2: 集成到 WebSocket

### Files
- Modify: `backend/app/main.py`

- [ ] **Step 1: 导入话题检测器**

```python
from app.core.topic_detector import topic_detector
```

- [ ] **Step 2: 检测话题切换**

在检测触发词后添加:
```python
# 检测话题切换
if topic_detector.detect_topic_switch(cleaned_content):
    await manager.broadcast(
        {"type": "topic_switched"},
        conversation_id,
    )
```

- [ ] **Step 3: 提交代码**

```bash
git add backend/app/main.py
git commit -m "feat: integrate topic detection into WebSocket"
```

---

## Chunk 3: 前端话题切换提示

### Files
- Modify: `frontend/src/pages/ChatPage.tsx`

- [ ] **Step 1: 添加话题切换状态**

```tsx
const [showTopicSwitched, setShowTopicSwitched] = useState(false);
```

- [ ] **Step 2: 处理 topic_switched 消息**

```tsx
} else if (data.type === 'topic_switched') {
  setShowTopicSwitched(true);
  setTimeout(() => setShowTopicSwitched(false), 3000);
}
```

- [ ] **Step 3: 添加提示 UI**

在消息区域顶部添加:
```tsx
{showTopicSwitched && (
  <div className="px-4 py-2 bg-primary/10 text-primary text-sm text-center">
    话题已切换
  </div>
)}
```

- [ ] **Step 4: 提交代码**

```bash
git add frontend/src/pages/ChatPage.tsx
git commit -m "feat: add topic switch notification UI"
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

1. 发送"换个话题"
2. 观察提示显示

- [ ] **Step 3: 最终提交**

```bash
git add .
git commit -m "feat: complete Step 7 - topic detection"
```

---

## 验收检查清单

- [ ] topic_detector.py 创建
- [ ] WebSocket 集成
- [ ] 前端提示
- [ ] 前端构建成功
- [ ] Git 提交

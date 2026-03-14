# ChatTable

AI Agent 社交聊天应用，让用户创建 AI 代理作为"朋友"进行私聊或群聊。

## 技术栈

**Backend**
- Python 3.10+ / FastAPI
- SQLModel / SQLite
- WebSocket 实时通信
- 包管理: `uv`

**Frontend**
- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Zustand 状态管理

## 快速开始

### Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

## 功能

- [x] Agent CRUD
- [ ] 私聊基础功能
- [ ] 群聊基础功能
- [ ] 决策引擎
- [ ] 长度控制
- [ ] 主题检测
- [ ] 记忆系统
- [ ] 知识库 (RAG)

## 项目结构

```
backend/          # FastAPI 后端
frontend/         # React 前端
docs/             # 设计文档
```

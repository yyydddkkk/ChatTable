from typing import Optional
from datetime import datetime
import json
from sqlmodel import Session
from app.models.agent import Agent
from app.schemas.agent import AgentCreate, AgentUpdate
from app.repositories.agent import agent_repository
from app.core.cache import app_cache


class AgentService:
    def __init__(self):
        self.repository = agent_repository

    def list_agents(self, db: Session, skip: int = 0, limit: int = 100) -> list[Agent]:
        return self.repository.get_multi(db, skip, limit)

    def get_agent(self, db: Session, agent_id: int) -> Optional[Agent]:
        return self.repository.get_by_id(db, agent_id)

    def create_agent(self, db: Session, agent_in: AgentCreate) -> Agent:
        agent = Agent(**agent_in.model_dump())
        db.add(agent)
        db.commit()
        db.refresh(agent)
        app_cache.invalidate_prefix("agent:")
        return agent

    def update_agent(
        self, db: Session, agent_id: int, agent_in: AgentUpdate
    ) -> Optional[Agent]:
        agent = self.repository.get_by_id(db, agent_id)
        if not agent:
            return None

        update_data = agent_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(agent, field, value)

        agent.updated_at = datetime.now()
        db.add(agent)
        db.commit()
        db.refresh(agent)
        app_cache.invalidate_prefix("agent:")
        return agent

    def delete_agent(self, db: Session, agent_id: int) -> bool:
        app_cache.invalidate_prefix("agent:")
        return self.repository.delete(db, agent_id)

    def toggle_active(self, db: Session, agent_id: int) -> Optional[Agent]:
        agent = self.repository.get_by_id(db, agent_id)
        if not agent:
            return None

        agent.is_active = not agent.is_active
        agent.updated_at = datetime.now()
        db.add(agent)
        db.commit()
        db.refresh(agent)
        return agent

    @staticmethod
    def build_system_prompt(agent: Agent, is_group: bool = False) -> str:
        """将结构化人格字段 + 自定义 system_prompt 组装成完整 prompt"""
        parts = []
        if agent.system_prompt:
            parts.append(agent.system_prompt)
        if agent.personality:
            parts.append(f"你的性格特征：{agent.personality}")
        if agent.background:
            parts.append(f"你的背景：{agent.background}")
        if agent.skills:
            try:
                skill_list = json.loads(agent.skills)
                if isinstance(skill_list, list) and skill_list:
                    parts.append(f"你的技能：{', '.join(str(s) for s in skill_list)}")
            except (json.JSONDecodeError, TypeError):
                pass

        base = "\n\n".join(parts) if parts else "You are a helpful AI assistant."

        # 群聊约束：只以自己身份回答
        if is_group:
            base += f"\n\n【重要】你的名字是「{agent.name}」。这是一个群聊场景，群里有多个 AI 角色。你只能以「{agent.name}」的身份回答，绝对不要模仿、代替或扮演其他角色发言。只输出你自己的回复内容，不要加角色名前缀。"

        return base

    @staticmethod
    async def generate_persona(description: str) -> dict:
        """用 LLM 根据角色描述自动生成结构化人格数据，复用 AppSettings 中的优化服务商配置"""
        from sqlmodel import Session
        from app.core.database import engine
        from app.core.security import security_manager
        from app.models.app_settings import AppSettings
        from app.models.provider import Provider
        import httpx

        with Session(engine) as db:
            app_settings = db.get(AppSettings, 1)
            if not app_settings or not app_settings.optimizer_provider_id:
                raise ValueError("请先在设置中配置 AI 优化的服务商")

            provider = db.get(Provider, app_settings.optimizer_provider_id)
            if not provider:
                raise ValueError("优化服务商不存在，请检查设置")

            api_key = security_manager.decrypt(provider.api_key)
            api_base = provider.api_base
            model = app_settings.optimizer_model

        prompt = f"""根据以下角色描述，生成一个 AI 角色的结构化人格数据。请严格以 JSON 格式返回，不要包含其他文字。

角色描述：{description}

返回格式：
{{
  "name": "角色名称",
  "description": "一句话简介",
  "personality": "性格特征描述",
  "background": "背景故事",
  "skills": ["技能1", "技能2", "技能3"],
  "tags": ["标签1", "标签2"],
  "system_prompt": "适合该角色的系统提示词"
}}"""

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "你是一个角色设计专家，擅长创建丰富的 AI 角色人格。请只返回 JSON，不要包含 markdown 代码块标记。"},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.7,
                },
            )
            response.raise_for_status()
            data = response.json()
            text = data["choices"][0]["message"]["content"].strip()

        # Strip markdown code fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[-1]
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
        text = text.strip()

        try:
            result = json.loads(text)
        except json.JSONDecodeError:
            raise ValueError(f"LLM 返回的不是有效 JSON: {text[:200]}")

        # Normalize skills/tags to JSON strings
        if isinstance(result.get("skills"), list):
            result["skills"] = json.dumps(result["skills"], ensure_ascii=False)
        if isinstance(result.get("tags"), list):
            result["tags"] = json.dumps(result["tags"], ensure_ascii=False)

        return result


agent_service = AgentService()

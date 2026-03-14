import httpx
from sqlmodel import Session, select
from app.core.config import get_logger
from app.core.database import engine
from app.core.security import security_manager
from app.models.app_settings import AppSettings
from app.models.provider import Provider

logger = get_logger(__name__)

OPTIMIZE_SYSTEM_PROMPT = """你是一个专业的 AI Agent 系统提示词优化专家。用户会给你一段系统提示词（system prompt），请你优化它，使其更加清晰、结构化、有效。

优化原则：
1. 保留原始意图和角色设定
2. 使指令更加明确和具体
3. 添加合理的约束和边界
4. 改善结构和可读性
5. 确保语气和风格一致

直接返回优化后的提示词文本，不要添加任何解释或前缀。"""


async def optimize_prompt(prompt: str) -> str:
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
                    {"role": "system", "content": OPTIMIZE_SYSTEM_PROMPT},
                    {"role": "user", "content": f"请优化以下系统提示词：\n\n{prompt}"},
                ],
                "temperature": 0.7,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()

import pytest

from app.modules.agents.domain.agent_definition import AgentDefinition
from app.modules.agents.domain.agent_event import AgentEvent
from app.modules.agents.domain.reply_task import ReplyTask
from app.modules.agents.infrastructure.langgraph_runtime import LangGraphAgentRuntime


@pytest.mark.anyio
async def test_runtime_only_invokes_allowed_capabilities() -> None:
    calls: list[str] = []

    async def fake_rag(_definition, _event):
        calls.append("rag")
        return ["rag-result"]

    async def fake_tools(_definition, _event, _task):
        calls.append("tools")
        return ["tool-result"]

    async def fake_skills(_definition, _event, _task):
        calls.append("skills")
        return ["skill-result"]

    async def fake_streamer(_definition, _event, _task, context):
        assert "rag-result" in context
        assert "tool-result" not in context
        assert "skill-result" in context
        yield "ok"

    runtime = LangGraphAgentRuntime(
        definition=AgentDefinition(
            agent_id=5,
            name="Ivy",
            model="gpt-4o",
            tools=["calendar"],
            skills=["comfort_chat"],
            knowledge_sources=["movie_kb"],
        ),
        response_streamer=fake_streamer,
        rag_gateway=fake_rag,
        tool_gateway=fake_tools,
        skill_gateway=fake_skills,
    )

    response = await runtime.run_reply_path(
        task=ReplyTask(
            task_id="reply-5",
            agent_id=5,
            conversation_id=99,
            event_id="evt-99",
            turn_index=1,
            allow_rag=True,
            allow_tools=False,
            allow_skills=True,
        ),
        event=AgentEvent(
            event_id="evt-99",
            conversation_id=99,
            agent_id=None,
            event_type="conversation_message",
            content="help me pick a movie",
        ),
    )

    assert response == "ok"
    assert calls == ["rag", "skills"]

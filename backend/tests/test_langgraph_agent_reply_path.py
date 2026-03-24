import pytest

from app.modules.agents.domain.agent_definition import AgentDefinition
from app.modules.agents.domain.agent_event import AgentEvent
from app.modules.agents.domain.reply_task import ReplyTask
from app.modules.agents.infrastructure.langgraph_runtime import LangGraphAgentRuntime


@pytest.mark.anyio
async def test_runtime_streams_reply_for_selected_task() -> None:
    streamed_chunks: list[str] = []
    persisted_messages: list[dict[str, object]] = []

    async def fake_streamer(definition, event, task, context):
        assert definition.agent_id == 4
        assert context == ["recent: hello"]
        yield "Hi"
        yield " there"

    async def fake_on_chunk(chunk: str) -> None:
        streamed_chunks.append(chunk)

    async def fake_persist(*, task: ReplyTask, event: AgentEvent, content: str) -> None:
        persisted_messages.append(
            {
                "agent_id": task.agent_id,
                "conversation_id": event.conversation_id,
                "content": content,
            }
        )

    runtime = LangGraphAgentRuntime(
        definition=AgentDefinition(agent_id=4, name="Luna", model="gpt-4o"),
        context_loader=lambda _definition, _event, _task: ["recent: hello"],
        response_streamer=fake_streamer,
        message_persister=fake_persist,
    )
    response = await runtime.run_reply_path(
        task=ReplyTask(
            task_id="reply-1",
            agent_id=4,
            conversation_id=30,
            event_id="evt-30",
            turn_index=1,
        ),
        event=AgentEvent(
            event_id="evt-30",
            conversation_id=30,
            agent_id=None,
            event_type="conversation_message",
            content="say hi",
        ),
        on_chunk=fake_on_chunk,
    )

    assert response == "Hi there"
    assert streamed_chunks == ["Hi", " there"]
    assert persisted_messages == [
        {"agent_id": 4, "conversation_id": 30, "content": "Hi there"}
    ]

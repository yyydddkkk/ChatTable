import asyncio

import pytest

from app.modules.agents.application.reply_executor import ReplyExecutor
from app.modules.agents.domain.reply_task import ReplyTask


@pytest.mark.anyio
async def test_reply_executor_staggers_selected_agents() -> None:
    recorded_delays: list[int] = []
    executed_agents: list[int] = []

    async def fake_sleep(delay: float) -> None:
        recorded_delays.append(int(delay * 1000))
        await asyncio.sleep(0)

    async def fake_runner(task: ReplyTask) -> None:
        executed_agents.append(task.agent_id)

    executor = ReplyExecutor(sleep_fn=fake_sleep)
    tasks = [
        ReplyTask(task_id="t1", agent_id=1, conversation_id=10, event_id="evt", turn_index=1, start_after_ms=0),
        ReplyTask(task_id="t2", agent_id=2, conversation_id=10, event_id="evt", turn_index=2, start_after_ms=800),
        ReplyTask(task_id="t3", agent_id=3, conversation_id=10, event_id="evt", turn_index=3, start_after_ms=2000),
    ]

    await executor.execute(tasks, runner=fake_runner)

    assert executed_agents == [1, 2, 3]
    assert recorded_delays == [0, 800, 2000]


@pytest.mark.anyio
async def test_reply_executor_skips_stale_tasks() -> None:
    executed_agents: list[int] = []

    async def fake_runner(task: ReplyTask) -> None:
        executed_agents.append(task.agent_id)

    executor = ReplyExecutor(sleep_fn=lambda _delay: asyncio.sleep(0))
    tasks = [
        ReplyTask(task_id="t1", agent_id=1, conversation_id=10, event_id="evt", turn_index=1),
        ReplyTask(task_id="t2", agent_id=2, conversation_id=10, event_id="evt", turn_index=2),
    ]

    await executor.execute(
        tasks,
        runner=fake_runner,
        should_cancel=lambda task: task.agent_id == 2,
    )

    assert executed_agents == [1]

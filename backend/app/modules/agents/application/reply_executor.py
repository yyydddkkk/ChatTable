import asyncio
from collections.abc import Awaitable, Callable, Iterable

from app.modules.agents.domain.reply_task import ReplyTask

Runner = Callable[[ReplyTask], Awaitable[None]]
ShouldCancel = Callable[[ReplyTask], bool]
SleepFn = Callable[[float], Awaitable[None]]


class ReplyExecutor:
    def __init__(self, sleep_fn: SleepFn | None = None) -> None:
        self._sleep_fn = sleep_fn or asyncio.sleep

    async def execute(
        self,
        tasks: Iterable[ReplyTask],
        *,
        runner: Runner,
        should_cancel: ShouldCancel | None = None,
    ) -> None:
        scheduled = [
            asyncio.create_task(self._run_task(task, runner=runner, should_cancel=should_cancel))
            for task in sorted(tasks, key=lambda item: (item.turn_index, item.start_after_ms, item.agent_id))
        ]
        if scheduled:
            await asyncio.gather(*scheduled)

    async def _run_task(
        self,
        task: ReplyTask,
        *,
        runner: Runner,
        should_cancel: ShouldCancel | None,
    ) -> None:
        await self._sleep_fn(task.start_after_ms / 1000)
        if should_cancel is not None and should_cancel(task):
            return
        await runner(task)

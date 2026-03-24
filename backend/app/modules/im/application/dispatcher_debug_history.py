from __future__ import annotations

from collections import defaultdict, deque
from copy import deepcopy
from threading import Lock
from typing import Any


class DispatcherDebugHistoryStore:
    def __init__(self, max_entries_per_conversation: int = 100) -> None:
        self._max_entries_per_conversation = max(1, max_entries_per_conversation)
        self._items: dict[tuple[str, int], deque[dict[str, Any]]] = defaultdict(
            lambda: deque(maxlen=self._max_entries_per_conversation)
        )
        self._lock = Lock()

    def append(
        self,
        tenant_id: str,
        conversation_id: int,
        payload: dict[str, Any],
    ) -> None:
        key = (tenant_id, conversation_id)
        item = deepcopy(payload)
        with self._lock:
            self._items[key].append(item)

    def list_recent(
        self,
        tenant_id: str,
        conversation_id: int,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        safe_limit = max(1, limit)
        key = (tenant_id, conversation_id)
        with self._lock:
            items = list(self._items.get(key, ()))
        recent = list(reversed(items[-safe_limit:]))
        return [deepcopy(item) for item in recent]


dispatcher_debug_history_store = DispatcherDebugHistoryStore()

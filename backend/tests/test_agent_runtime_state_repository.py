from app.models.agent_checkpoint import AgentCheckpoint
from app.models.agent_event_log import AgentEventLog
from app.models.agent_memory_entry import AgentMemoryEntry
from app.models.agent_relationship_state import AgentRelationshipState
from app.models.agent_runtime_state import AgentRuntimeState
from app.modules.agents.infrastructure.state_repository import AgentStateRepository


class _FakeResult:
    def __init__(self, value):
        self._value = value

    def first(self):
        return self._value


class _FakeDb:
    def __init__(self):
        self.rows = {
            AgentRuntimeState: [],
            AgentRelationshipState: [],
            AgentEventLog: [],
            AgentCheckpoint: [],
            AgentMemoryEntry: [],
        }
        self._next_id = 1

    def exec(self, _statement):
        return _FakeResult(None)

    def add(self, obj):
        bucket = self.rows.setdefault(type(obj), [])
        if obj not in bucket:
            bucket.append(obj)

    def commit(self):
        return None

    def refresh(self, obj):
        if getattr(obj, "id", None) is None:
            obj.id = self._next_id
            self._next_id += 1


def test_state_repository_persists_runtime_state() -> None:
    db = _FakeDb()
    repository = AgentStateRepository(db)

    state = repository.save_runtime_state(
        agent_id=7,
        mood="curious",
        activity_level=0.75,
        attention_topics=["movies", "music"],
        relationship_strength=0.6,
    )
    relationship = repository.save_relationship_state(
        agent_id=7,
        user_id=1,
        affinity_score=0.8,
        trust_score=0.65,
        summary="friendly and playful",
    )
    event = repository.log_event(
        agent_id=7,
        conversation_id=22,
        event_id="evt-22",
        event_type="conversation_message",
        payload={"content": "hello"},
    )
    checkpoint = repository.save_checkpoint(
        agent_id=7,
        checkpoint_key="thread-7",
        state_json='{"step":"reply"}',
    )
    memory = repository.add_memory_entry(
        agent_id=7,
        conversation_id=22,
        memory_type="summary",
        content="User likes movies.",
        importance_score=0.9,
    )

    assert state.id is not None
    assert relationship.id is not None
    assert event.id is not None
    assert checkpoint.id is not None
    assert memory.id is not None

    assert state.attention_topics_json == '["movies", "music"]'
    assert relationship.summary == "friendly and playful"
    assert event.payload_json == '{"content": "hello"}'
    assert checkpoint.checkpoint_key == "thread-7"
    assert memory.importance_score == 0.9

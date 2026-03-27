from sqlmodel import SQLModel, create_engine, text
from app.core.config import settings, get_logger

logger = get_logger(__name__)

# Database URL
DATABASE_URL = settings.database_url

# Create engine
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=settings.debug, connect_args=connect_args)

# New columns to add to existing tables (table, column, type, default)
_MIGRATIONS = [
    ("agents", "tenant_id", "VARCHAR(100)", "local"),
    ("agents", "personality", "TEXT", None),
    ("agents", "background", "TEXT", None),
    ("agents", "skills", "TEXT", None),
    ("agents", "tags", "TEXT", None),
    ("providers", "tenant_id", "VARCHAR(100)", "local"),
    ("conversations", "tenant_id", "VARCHAR(100)", "local"),
    ("messages", "tenant_id", "VARCHAR(100)", "local"),
    ("conversation_memories", "tenant_id", "VARCHAR(100)", "local"),
    ("app_settings", "tenant_id", "VARCHAR(100)", "local"),
    ("autogen_checkpoints", "tenant_id", "VARCHAR(100)", "local"),
]

_INDEX_MIGRATIONS = [
    "CREATE INDEX IF NOT EXISTS ix_agents_tenant_active ON agents (tenant_id, is_active)",
    "CREATE INDEX IF NOT EXISTS ix_providers_tenant_name ON providers (tenant_id, name)",
    "CREATE INDEX IF NOT EXISTS ix_conversations_tenant_type_created ON conversations (tenant_id, type, created_at)",
    "CREATE INDEX IF NOT EXISTS ix_messages_tenant_conversation_created ON messages (tenant_id, conversation_id, created_at)",
    "CREATE INDEX IF NOT EXISTS ix_conversation_memories_tenant_conv_agent ON conversation_memories (tenant_id, conversation_id, agent_id)",
    "CREATE INDEX IF NOT EXISTS ix_autogen_checkpoints_tenant_updated ON autogen_checkpoints (tenant_id, updated_at)",
    "CREATE INDEX IF NOT EXISTS ix_audit_logs_tenant_created_at ON audit_logs (tenant_id, created_at)",
]


def _run_migrations():
    """Add missing columns to existing tables"""
    with engine.connect() as conn:
        for table, column, col_type, default in _MIGRATIONS:
            try:
                conn.execute(text(f"SELECT {column} FROM {table} LIMIT 1"))
            except Exception:
                conn.rollback()
                default_clause = f" DEFAULT '{default}'" if default else ""
                sql = f"ALTER TABLE {table} ADD COLUMN {column} {col_type}{default_clause}"
                conn.execute(text(sql))
                logger.info(f"Migration: added {table}.{column}")

        for sql in _INDEX_MIGRATIONS:
            try:
                conn.execute(text(sql))
            except Exception as exc:
                conn.rollback()
                logger.warning("Migration: failed to create index with SQL '%s': %s", sql, exc)
        conn.commit()


def init_db():
    """Initialize database tables"""
    from app.models.agent import Agent
    from app.models.audit_log import AuditLog
    from app.models.autogen_checkpoint import AutogenCheckpoint
    from app.models.conversation import Conversation
    from app.models.message import Message
    from app.models.provider import Provider
    from app.models.app_settings import AppSettings
    from app.models.user import User

    SQLModel.metadata.create_all(engine)
    _run_migrations()


def get_db():
    """Get database session"""
    from sqlmodel import Session

    with Session(engine) as session:
        yield session

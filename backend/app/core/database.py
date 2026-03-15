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
    ("agents", "personality", "TEXT", None),
    ("agents", "background", "TEXT", None),
    ("agents", "skills", "TEXT", None),
    ("agents", "tags", "TEXT", None),
]


def _run_migrations():
    """Add missing columns to existing tables"""
    with engine.connect() as conn:
        for table, column, col_type, default in _MIGRATIONS:
            try:
                conn.execute(text(f"SELECT {column} FROM {table} LIMIT 1"))
            except Exception:
                default_clause = f" DEFAULT '{default}'" if default else ""
                sql = f"ALTER TABLE {table} ADD COLUMN {column} {col_type}{default_clause}"
                conn.execute(text(sql))
                logger.info(f"Migration: added {table}.{column}")
        conn.commit()


def init_db():
    """Initialize database tables"""
    from app.models.agent import Agent
    from app.models.autogen_checkpoint import AutogenCheckpoint
    from app.models.conversation import Conversation
    from app.models.message import Message
    from app.models.provider import Provider
    from app.models.app_settings import AppSettings

    SQLModel.metadata.create_all(engine)
    _run_migrations()


def get_db():
    """Get database session"""
    from sqlmodel import Session

    with Session(engine) as session:
        yield session

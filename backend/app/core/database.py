from sqlmodel import SQLModel, create_engine
from app.core.config import settings

# Database URL
DATABASE_URL = "sqlite:///./chattable.db"

# Create engine
engine = create_engine(
    DATABASE_URL, echo=settings.debug, connect_args={"check_same_thread": False}
)


def init_db():
    """Initialize database tables"""
    from app.models.agent import Agent  # Import to register model

    SQLModel.metadata.create_all(engine)


def get_db():
    """Get database session"""
    from sqlmodel import Session

    with Session(engine) as session:
        yield session

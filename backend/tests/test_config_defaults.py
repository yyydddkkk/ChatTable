from pathlib import Path

from app.core.config import ENV_FILE, Settings


def test_settings_default_to_local_postgres_and_redis() -> None:
    settings = Settings(_env_file=None)

    assert settings.database_url == (
        "postgresql+psycopg://postgres:postgres@localhost:5432/chattable"
    )
    assert settings.redis_url == "redis://localhost:6379/0"


def test_settings_env_file_points_to_backend_env() -> None:
    assert ENV_FILE == Path(__file__).resolve().parents[1] / ".env"

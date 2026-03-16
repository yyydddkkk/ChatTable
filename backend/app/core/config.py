import logging

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "ChatTable"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000
    encryption_key: str = "chattable-secret"
    log_level: str = "INFO"
    database_url: str = "sqlite:///./chattable.db"
    redis_url: str = "redis://localhost:6379/0"
    chat_engine: str = "legacy"

    dispatcher_enabled: bool = True
    dispatcher_mode: str = "mixed"
    dispatcher_hard_cap: int = 5
    dispatcher_max_rounds: int = 2
    dispatcher_planner_model: str = "qwen3.5-plus"
    dispatcher_planner_api_key: str = ""
    dispatcher_planner_api_base: str = ""
    dispatcher_planner_timeout_ms: int = 2500
    dispatcher_planner_retry: int = 1
    dispatcher_debug_feedback: bool = True

    class Config:
        env_file = ".env"


settings = Settings()


def setup_logging():
    """Configure application logging"""
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper()),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance"""
    return logging.getLogger(name)

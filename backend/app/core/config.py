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
    dispatcher_planner_model: str = "qwen-plus"
    dispatcher_planner_api_key: str = ""
    dispatcher_planner_api_base: str = ""
    dispatcher_planner_timeout_ms: int = 2500
    dispatcher_planner_retry: int = 1
    dispatcher_debug_feedback: bool = True
    stream_chunk_batch_chars: int = 24
    autogen_core_log_level: str = "WARNING"
    autogen_events_log_level: str = "WARNING"

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
    autogen_core_level = getattr(
        logging, settings.autogen_core_log_level.upper(), logging.WARNING
    )
    autogen_events_level = getattr(
        logging, settings.autogen_events_log_level.upper(), logging.WARNING
    )
    logging.getLogger("autogen_core").setLevel(autogen_core_level)
    logging.getLogger("autogen_core.events").setLevel(autogen_events_level)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance"""
    return logging.getLogger(name)

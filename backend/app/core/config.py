import logging
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "ChatTable"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000
    encryption_key: str = "chattable-secret"
    log_level: str = "INFO"

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

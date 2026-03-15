from app.core.chat_handler import ChatHandler
from app.core.config import get_logger, settings
from app.modules.engine.application.ports import ChatEnginePort
from app.modules.engine.infrastructure.autogen_chat_engine import AutogenChatEngine
from app.modules.engine.infrastructure.legacy_chat_engine import LegacyChatEngine

logger = get_logger(__name__)


def create_chat_engine(chat_handler: ChatHandler) -> ChatEnginePort:
    engine_mode = (settings.chat_engine or "legacy").strip().lower()
    if engine_mode == "autogen":
        logger.info("Chat engine selected: autogen")
        return AutogenChatEngine()

    logger.info("Chat engine selected: legacy")
    return LegacyChatEngine(chat_handler)

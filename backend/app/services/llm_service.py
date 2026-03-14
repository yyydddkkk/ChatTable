from typing import AsyncGenerator
import litellm
from app.core.security import security_manager
from app.core.config import get_logger

logger = get_logger(__name__)


class LLMService:
    """Service for LLM interactions"""

    async def generate_stream(
        self,
        model: str,
        api_key: str,
        messages: list,
        api_base: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response from LLM"""
        try:
            # Decrypt API key
            decrypted_key = security_manager.decrypt(api_key)

            # Prepare kwargs
            kwargs = {
                "model": model,
                "messages": messages,
                "api_key": decrypted_key,
                "stream": True,
            }
            if api_base:
                kwargs["api_base"] = api_base

            logger.debug(f"LLM stream request: model={model}, api_base={api_base}")
            # Stream response
            response = await litellm.acompletion(**kwargs)

            # Handle different response types
            try:
                async for chunk in response:
                    if chunk.choices and chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            except TypeError:
                # Fallback for non-async iterables
                if hasattr(response, "__iter__"):
                    for chunk in response:
                        if chunk.choices and chunk.choices[0].delta.content:
                            yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"LLM stream error: {str(e)}", exc_info=True)
            raise Exception(f"LLM error: {str(e)}")

    async def generate(
        self,
        model: str,
        api_key: str,
        messages: list,
        api_base: str | None = None,
    ) -> str:
        """Generate non-streaming response from LLM"""
        try:
            decrypted_key = security_manager.decrypt(api_key)

            kwargs = {
                "model": model,
                "messages": messages,
                "api_key": decrypted_key,
                "stream": False,
            }
            if api_base:
                kwargs["api_base"] = api_base

            logger.info(f"LLM request: model={model}, api_base={api_base}")
            response = await litellm.acompletion(**kwargs)
            logger.debug(f"LLM response: {response}")

            if response.choices and response.choices[0].message.content:
                return response.choices[0].message.content
            return "0.5"

        except Exception as e:
            logger.error(f"LLM error: {type(e).__name__}: {e}", exc_info=True)
            return "0.5"


llm_service = LLMService()

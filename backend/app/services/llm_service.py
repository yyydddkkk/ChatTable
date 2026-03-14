from typing import AsyncGenerator
import litellm
from app.core.security import security_manager
from app.core.config import get_logger

logger = get_logger(__name__)


def normalize_api_base(api_base: str | None) -> tuple[str | None, str | None]:
    """Normalize API base URL and determine LLM provider

    Returns:
        tuple of (normalized_url, custom_llm_provider)
    """
    if not api_base:
        return None, None

    url = api_base.rstrip("/")
    if url.endswith("/chat/completions"):
        url = url[: -len("/chat/completions")]

    provider = None
    if "dashscope" in url:
        provider = "openai"  # DashScope is OpenAI-compatible
    elif "openai" in url:
        provider = "openai"

    logger.debug(f"Normalized api_base: {api_base} -> {url}, provider: {provider}")
    return url, provider


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

            # Normalize API base URL and get provider
            normalized_url, custom_provider = normalize_api_base(api_base)

            # Prepare kwargs
            kwargs = {
                "model": model,
                "messages": messages,
                "api_key": decrypted_key,
                "stream": True,
            }
            if normalized_url:
                kwargs["api_base"] = normalized_url
            if custom_provider:
                kwargs["custom_llm_provider"] = custom_provider

            logger.info(
                f"LLM stream request: model={model}, api_base='{normalized_url}', provider={custom_provider}"
            )
            logger.debug(
                f"Full kwargs: { {k: v if k != 'api_key' else '***' for k, v in kwargs.items()} }"
            )
            # Stream response
            try:
                response = await litellm.acompletion(**kwargs)
            except Exception as litellm_error:
                logger.error(
                    f"LiteLLM error details: model={model}, api_base='{api_base}'"
                )
                raise

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

            # Normalize API base URL and get provider
            normalized_url, custom_provider = normalize_api_base(api_base)

            kwargs = {
                "model": model,
                "messages": messages,
                "api_key": decrypted_key,
                "stream": False,
            }
            if normalized_url:
                kwargs["api_base"] = normalized_url
            if custom_provider:
                kwargs["custom_llm_provider"] = custom_provider

            logger.info(
                f"LLM request: model={model}, api_base='{normalized_url}', provider={custom_provider}"
            )
            response = await litellm.acompletion(**kwargs)
            logger.debug(f"LLM response: {response}")

            if response.choices and response.choices[0].message.content:
                return response.choices[0].message.content
            return "0.5"

        except Exception as e:
            logger.error(f"LLM error: {type(e).__name__}: {e}", exc_info=True)
            return "0.5"


llm_service = LLMService()

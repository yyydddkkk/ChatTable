from sqlmodel import Session, SQLModel, create_engine

from app.models.provider import Provider
from app.schemas.provider import ProviderCreate, ProviderUpdate
from app.services.llm_service import normalize_api_base
from app.services.provider_service import provider_service


def test_normalize_api_base_strips_control_characters() -> None:
    normalized_url, provider = normalize_api_base(
        "\thttps://dashscope.aliyuncs.com/compatible-mode/v1 \n"
    )

    assert normalized_url == "https://dashscope.aliyuncs.com/compatible-mode/v1"
    assert provider == "openai"


def test_provider_service_strips_api_base_on_create_and_update(monkeypatch) -> None:
    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(engine, tables=[Provider.__table__])

    monkeypatch.setattr("app.services.provider_service.log_audit", lambda *args, **kwargs: None)

    with Session(engine) as session:
        created = provider_service.create_provider(
            session,
            ProviderCreate(
                name="DashScope",
                api_key="secret",
                api_base="\thttps://dashscope.aliyuncs.com/compatible-mode/v1 \n",
            ),
        )

        assert created.api_base == "https://dashscope.aliyuncs.com/compatible-mode/v1"

        updated = provider_service.update_provider(
            session,
            created.id,
            ProviderUpdate(api_base="\thttps://api.deepseek.com/v1/chat/completions \n"),
        )

        assert updated is not None
        assert updated.api_base == "https://api.deepseek.com/v1/chat/completions"

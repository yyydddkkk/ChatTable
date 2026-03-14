from typing import Optional
from datetime import datetime
from sqlmodel import Session
from app.models.provider import Provider
from app.schemas.provider import ProviderCreate, ProviderUpdate
from app.repositories.provider import provider_repository
from app.core.security import security_manager


class ProviderService:
    def __init__(self):
        self.repository = provider_repository

    def list_providers(self, db: Session) -> list[Provider]:
        return self.repository.get_multi(db)

    def get_provider(self, db: Session, provider_id: int) -> Optional[Provider]:
        return self.repository.get_by_id(db, provider_id)

    def get_by_name(self, db: Session, name: str) -> Optional[Provider]:
        return self.repository.get_by_name(db, name)

    def create_provider(self, db: Session, data: ProviderCreate) -> Provider:
        provider = Provider(
            name=data.name,
            api_key=security_manager.encrypt(data.api_key),
            api_base=data.api_base,
        )
        db.add(provider)
        db.commit()
        db.refresh(provider)
        return provider

    def update_provider(
        self, db: Session, provider_id: int, data: ProviderUpdate
    ) -> Optional[Provider]:
        provider = self.repository.get_by_id(db, provider_id)
        if not provider:
            return None

        update_data = data.model_dump(exclude_unset=True)
        if "api_key" in update_data:
            update_data["api_key"] = security_manager.encrypt(update_data["api_key"])

        for field, value in update_data.items():
            setattr(provider, field, value)

        provider.updated_at = datetime.now()
        db.add(provider)
        db.commit()
        db.refresh(provider)
        return provider

    def delete_provider(self, db: Session, provider_id: int) -> bool:
        return self.repository.delete(db, provider_id)


provider_service = ProviderService()

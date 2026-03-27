from typing import Optional
from datetime import datetime
from sqlmodel import Session
from app.models.provider import Provider
from app.schemas.provider import ProviderCreate, ProviderUpdate
from app.repositories.provider import provider_repository
from app.core.audit import log_audit
from app.core.security import security_manager
from app.core.cache import app_cache
from app.core.tenant import get_current_tenant_id
from app.services.llm_service import sanitize_api_base


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
            tenant_id=get_current_tenant_id(),
            name=data.name,
            api_key=security_manager.encrypt(data.api_key),
            api_base=sanitize_api_base(data.api_base) or "",
        )
        db.add(provider)
        db.commit()
        db.refresh(provider)
        log_audit(
            db,
            action="provider.create",
            resource="provider",
            resource_id=str(provider.id),
            details={"name": provider.name},
        )
        db.commit()
        app_cache.invalidate_prefix("provider:")
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
        if "api_base" in update_data:
            update_data["api_base"] = sanitize_api_base(update_data["api_base"]) or ""

        for field, value in update_data.items():
            setattr(provider, field, value)

        provider.updated_at = datetime.now()
        db.add(provider)
        db.commit()
        db.refresh(provider)
        log_audit(
            db,
            action="provider.update",
            resource="provider",
            resource_id=str(provider.id),
            details={"fields": list(update_data.keys())},
        )
        db.commit()
        app_cache.invalidate_prefix("provider:")
        return provider

    def delete_provider(self, db: Session, provider_id: int) -> bool:
        log_audit(
            db,
            action="provider.delete",
            resource="provider",
            resource_id=str(provider_id),
        )
        db.commit()
        app_cache.invalidate_prefix("provider:")
        return self.repository.delete(db, provider_id)


provider_service = ProviderService()

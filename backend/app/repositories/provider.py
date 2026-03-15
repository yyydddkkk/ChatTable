from typing import Optional
from sqlmodel import Session, select
from app.models.provider import Provider
from app.schemas.provider import ProviderCreate, ProviderUpdate
from app.repositories.base import BaseRepository


class ProviderRepository(BaseRepository[Provider, ProviderCreate, ProviderUpdate]):
    def get_by_id(self, db: Session, provider_id: int) -> Optional[Provider]:
        return self.get(db, provider_id)

    def get_by_name(self, db: Session, name: str) -> Optional[Provider]:
        stmt = select(Provider).where(Provider.name == name)
        stmt = self._apply_tenant_filter(stmt)
        return db.exec(stmt).first()


provider_repository = ProviderRepository(Provider)

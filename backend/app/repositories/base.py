from typing import Generic, TypeVar, Type, Optional, List
from sqlmodel import Session, select
from pydantic import BaseModel

from app.core.tenant import get_current_tenant_id

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    def _has_tenant(self) -> bool:
        return hasattr(self.model, "tenant_id")

    def _apply_tenant_filter(self, stmt):
        if self._has_tenant():
            return stmt.where(self.model.tenant_id == get_current_tenant_id())
        return stmt

    def get(self, db: Session, id: int) -> Optional[ModelType]:
        stmt = select(self.model).where(self.model.id == id)
        stmt = self._apply_tenant_filter(stmt)
        return db.exec(stmt).first()

    def get_multi(
        self, db: Session, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        stmt = select(self.model).offset(skip).limit(limit)
        stmt = self._apply_tenant_filter(stmt)
        return db.exec(stmt).all()

    def create(self, db: Session, obj_in: CreateSchemaType) -> ModelType:
        obj_dict = (
            obj_in.model_dump() if hasattr(obj_in, "model_dump") else obj_in.dict()
        )
        if self._has_tenant() and "tenant_id" not in obj_dict:
            obj_dict["tenant_id"] = get_current_tenant_id()
        db_obj = self.model(**obj_dict)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self, db: Session, db_obj: ModelType, obj_in: UpdateSchemaType
    ) -> ModelType:
        update_data = (
            obj_in.model_dump(exclude_unset=True)
            if hasattr(obj_in, "model_dump")
            else obj_in.dict(exclude_unset=True)
        )
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, id: int) -> bool:
        obj = self.get(db, id)
        if obj:
            db.delete(obj)
            db.commit()
            return True
        return False

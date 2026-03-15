import base64
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from sqlmodel import Session, select

from app.core.config import settings
from app.models.user import User

PASSWORD_SCHEME = "pbkdf2_sha256"
PBKDF2_ITERATIONS = 120_000


class AuthService:
    def hash_password(self, password: str) -> str:
        salt = os.urandom(16)
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), salt, PBKDF2_ITERATIONS
        )
        return (
            f"{PASSWORD_SCHEME}${PBKDF2_ITERATIONS}$"
            f"{base64.urlsafe_b64encode(salt).decode()}$"
            f"{base64.urlsafe_b64encode(digest).decode()}"
        )

    def verify_password(self, password: str, password_hash: str) -> bool:
        try:
            scheme, iterations, salt_b64, digest_b64 = password_hash.split("$", 3)
            if scheme != PASSWORD_SCHEME:
                return False
            salt = base64.urlsafe_b64decode(salt_b64.encode())
            expected = base64.urlsafe_b64decode(digest_b64.encode())
            actual = hashlib.pbkdf2_hmac(
                "sha256", password.encode(), salt, int(iterations)
            )
            return hmac.compare_digest(actual, expected)
        except Exception:
            return False

    def create_access_token(
        self, *, user_id: int, tenant_id: str, username: str, expires_minutes: int = 60 * 24
    ) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(user_id),
            "tenant_id": tenant_id,
            "username": username,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=expires_minutes)).timestamp()),
        }
        return jwt.encode(payload, settings.encryption_key, algorithm="HS256")

    def decode_access_token(self, token: str) -> dict:
        return jwt.decode(token, settings.encryption_key, algorithms=["HS256"])

    def get_user_by_tenant_username(
        self, db: Session, tenant_id: str, username: str
    ) -> Optional[User]:
        return db.exec(
            select(User).where(User.tenant_id == tenant_id, User.username == username)
        ).first()

    def get_user_by_id(self, db: Session, user_id: int) -> Optional[User]:
        return db.exec(select(User).where(User.id == user_id)).first()

    def register_user(
        self, db: Session, tenant_id: str, username: str, password: str
    ) -> User:
        existing = self.get_user_by_tenant_username(db, tenant_id, username)
        if existing:
            raise ValueError("Username already exists in this tenant")

        user = User(
            tenant_id=tenant_id,
            username=username,
            password_hash=self.hash_password(password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def authenticate(
        self, db: Session, tenant_id: str, username: str, password: str
    ) -> Optional[User]:
        user = self.get_user_by_tenant_username(db, tenant_id, username)
        if not user:
            return None
        if not self.verify_password(password, user.password_hash):
            return None
        return user


auth_service = AuthService()

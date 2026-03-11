from cryptography.fernet import Fernet
from app.core.config import settings
import base64
import hashlib


class SecurityManager:
    """API Key encryption manager"""

    def __init__(self):
        # Generate a key from settings or use a default
        # In production, this should be from environment variable
        key = (
            settings.encryption_key
            if hasattr(settings, "encryption_key")
            else "chattable-secret-key-change-in-production"
        )
        # Derive a 32-byte key for Fernet
        derived_key = hashlib.sha256(key.encode()).digest()
        self.cipher = Fernet(base64.urlsafe_b64encode(derived_key))

    def encrypt(self, plaintext: str) -> str:
        """Encrypt a plaintext string"""
        return self.cipher.encrypt(plaintext.encode()).decode()

    def decrypt(self, ciphertext: str) -> str:
        """Decrypt a ciphertext string"""
        return self.cipher.decrypt(ciphertext.encode()).decode()


security_manager = SecurityManager()

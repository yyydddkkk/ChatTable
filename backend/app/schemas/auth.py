from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    tenant_id: str = Field(min_length=1, max_length=100)
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    tenant_id: str = Field(min_length=1, max_length=100)
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=6, max_length=128)


class UserResponse(BaseModel):
    id: int
    tenant_id: str
    username: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    tenant_id: str

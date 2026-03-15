from fastapi import APIRouter, Depends, Header, HTTPException
from sqlmodel import Session

from app.api.dependencies import get_db
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    try:
        user = auth_service.register_user(
            db=db,
            tenant_id=data.tenant_id.strip(),
            username=data.username.strip(),
            password=data.password,
        )
        return UserResponse.model_validate(user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = auth_service.authenticate(
        db=db,
        tenant_id=data.tenant_id.strip(),
        username=data.username.strip(),
        password=data.password,
    )
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = auth_service.create_access_token(
        user_id=user.id or 0,
        tenant_id=user.tenant_id,
        username=user.username,
    )
    return TokenResponse(access_token=token, tenant_id=user.tenant_id)


@router.get("/me", response_model=UserResponse)
def me(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = auth_service.decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = int(payload.get("sub", "0"))
    user = auth_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return UserResponse.model_validate(user)

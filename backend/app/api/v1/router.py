from fastapi import APIRouter
from app.api.v1.auth_endpoints import router as auth_router
from app.api.v1.endpoints import router as endpoints_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(endpoints_router)

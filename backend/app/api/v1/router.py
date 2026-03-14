from fastapi import APIRouter
from app.api.v1.endpoints import router as endpoints_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(endpoints_router)

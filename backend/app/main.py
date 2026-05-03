from fastapi import FastAPI

from app.api.auth import router as auth_router
from app.api.conversation import router as conversation_router
from app.api.health import router as health_router
from app.api.profile import router as profile_router


def create_app() -> FastAPI:
    app = FastAPI(title="CareerPal API")
    app.include_router(health_router, prefix="/api")
    app.include_router(auth_router, prefix="/api")
    app.include_router(profile_router, prefix="/api")
    app.include_router(conversation_router, prefix="/api")
    return app


app = create_app()

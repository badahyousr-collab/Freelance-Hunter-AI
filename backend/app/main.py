"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import router as auth_router
from app.config import settings

app = FastAPI(
    title=settings.app_name + " API",
    version="0.1.0",
    description="API for freelance project discovery, matching, and proposal tracking.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(auth_router)


@app.get("/health", tags=["operations"])
def health() -> dict[str, str]:
    """Liveness check; does not expose credentials or infrastructure details."""
    return {"status": "ok", "service": "freelance-hunter-ai-api"}


@app.get("/ready", tags=["operations"])
def ready() -> dict[str, str]:
    """Basic process readiness; dependency checks are added with operational hardening."""
    return {"status": "ready"}

"""FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Freelance Hunter AI API",
    version="0.1.0",
    description="API for freelance project discovery, matching, and proposal tracking.",
)

# Local-development defaults only. Production origins must be explicitly configured.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health", tags=["operations"])
def health() -> dict[str, str]:
    """Liveness check; does not expose credentials or infrastructure details."""
    return {"status": "ok", "service": "freelance-hunter-ai-api"}


@app.get("/ready", tags=["operations"])
def ready() -> dict[str, str]:
    """Initial readiness endpoint; database dependency checks will be added with persistence."""
    return {"status": "ready"}

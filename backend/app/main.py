"""FastAPI application entry point: app instance, CORS, and router registration."""

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.ai.errors import AIServiceError
from app.routes import router
from app.services.email_digest import InvalidEmailError
from app.storage.critical_messages import StorageError

FRONTEND_ORIGIN = "http://localhost:3000"
# User-visible 503 texts (docs/requirements.md, API contract). Defined once in the backend.
AI_UNAVAILABLE_DETAIL = "Los servidores están ocupados. Intentá de nuevo más tarde."
PANEL_UNAVAILABLE_DETAIL = "No se pudo cargar el panel. Intentá de nuevo más tarde."
# User-visible 422 text for an unreadable email (US-4.2); the same text the frontend shows.
EMAIL_UNREADABLE_DETAIL = "No se pudo leer el correo. Verificá que sea un archivo .eml de hasta 1 MB."

logger = logging.getLogger(__name__)

app = FastAPI(title="ScamGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
    allow_credentials=False,
)


@app.exception_handler(AIServiceError)
async def handle_ai_service_error(request: Request, error: AIServiceError) -> JSONResponse:
    logger.warning("AI service error: %s", error)  # Internal cause only; never sent to the client.
    return JSONResponse(status_code=503, content={"detail": AI_UNAVAILABLE_DETAIL})


@app.exception_handler(StorageError)
async def handle_storage_error(request: Request, error: StorageError) -> JSONResponse:
    logger.warning("Storage error: %s", error)  # Internal cause only; never sent to the client.
    return JSONResponse(status_code=503, content={"detail": PANEL_UNAVAILABLE_DETAIL})


@app.exception_handler(InvalidEmailError)
async def handle_invalid_email_error(request: Request, error: InvalidEmailError) -> JSONResponse:
    logger.info("Unreadable email: %s", error)  # Fixed cause only; email content is never logged.
    return JSONResponse(status_code=422, content={"detail": EMAIL_UNREADABLE_DETAIL})


app.include_router(router)

"""FastAPI application entry point: app instance, CORS, and router registration."""

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.ai.errors import AIServiceError
from app.routes import router

FRONTEND_ORIGIN = "http://localhost:3000"
# User-visible 503 text (docs/requirements.md, API contract). Defined once in the backend.
AI_UNAVAILABLE_DETAIL = "Los servidores están ocupados. Intentá de nuevo más tarde."

logger = logging.getLogger(__name__)

app = FastAPI(title="ScamGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
    allow_credentials=False,
)


@app.exception_handler(AIServiceError)
async def handle_ai_service_error(request: Request, error: AIServiceError) -> JSONResponse:
    logger.warning("AI service error: %s", error)  # Internal cause only; never sent to the client.
    return JSONResponse(status_code=503, content={"detail": AI_UNAVAILABLE_DETAIL})


app.include_router(router)

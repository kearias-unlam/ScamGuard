"""FastAPI application entry point: app instance, CORS, and router registration."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

FRONTEND_ORIGIN = "http://localhost:3000"

app = FastAPI(title="ScamGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
    allow_credentials=False,
)

# Routers are registered here (POST /analysis is added by task #16).

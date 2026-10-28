"""
main.py — FastAPI entry point for the CartPilot backend.

Endpoints:
  GET  /health    → liveness probe
  GET  /products  → full catalog, with optional name/category filter
  POST /chat      → AI assistant reply via Google Gemini (llm.py)

Environment variables (all read from backend/.env via python-dotenv):
  GEMINI_API_KEY    — required; Google AI Studio key
  PORT              — optional; defaults to 8000
  ALLOWED_ORIGINS   — optional; comma-separated origins, defaults to
                      "http://localhost:3000"
"""

from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

from llm import get_chat_reply, get_catalog_fallback_reply

# ---------------------------------------------------------------------------
# Environment & logging — must run before anything else
# ---------------------------------------------------------------------------

# Explicitly anchor .env to this file's directory so uvicorn's reloader
# subprocess (which may have a different CWD) always finds it.
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("cartpilot.main")

# ---------------------------------------------------------------------------
# CORS — read from env so the same image works in dev AND production
# ---------------------------------------------------------------------------

_raw_origins: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# ---------------------------------------------------------------------------
# Data layer — load product catalog once at startup into module-level cache
# ---------------------------------------------------------------------------

_PRODUCTS_PATH: Path = Path(__file__).parent / "products.json"
_products: list[dict] = []  # populated by the lifespan event


def _load_products() -> list[dict]:
    """
    Read products.json from disk and return the parsed list.

    Raises:
        FileNotFoundError: If the catalog file is missing.
        json.JSONDecodeError: If the file contains malformed JSON.
    """
    if not _PRODUCTS_PATH.exists():
        raise FileNotFoundError(
            f"Product catalog not found at {_PRODUCTS_PATH}. "
            "Ensure products.json is present in the backend directory."
        )
    with _PRODUCTS_PATH.open("r", encoding="utf-8") as fh:
        return json.load(fh)


# ---------------------------------------------------------------------------
# Application lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: D401
    """Load catalog on startup; release resources on shutdown."""
    global _products

    # ── Startup ──────────────────────────────────────────────────────────
    logger.info("CartPilot API starting up…")
    try:
        _products = _load_products()
        logger.info("✓ Product catalog loaded — %d item(s)", len(_products))
    except (FileNotFoundError, json.JSONDecodeError) as exc:
        logger.critical("✗ Failed to load product catalog: %s", exc)
        raise  # Prevent the server from starting with an empty/broken catalog

    logger.info("✓ CORS allowed origins: %s", ALLOWED_ORIGINS)
    logger.info("CartPilot API is ready.")

    yield  # ── Application runs here ────────────────────────────────────

    # ── Shutdown ─────────────────────────────────────────────────────────
    logger.info("CartPilot API shutting down. Goodbye.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="CartPilot API",
    description=(
        "AI-powered retail support assistant backend. "
        "Powered by Google Gemini 2.5 Flash."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class ChatRequest(BaseModel):
    """Request body for POST /chat."""

    message: str

    @field_validator("message")
    @classmethod
    def message_must_not_be_empty(cls, v: str) -> str:
        """Reject blank or whitespace-only messages with a clear 400 error."""
        if not v or not v.strip():
            raise ValueError("message must not be empty or whitespace.")
        return v.strip()


class ChatResponse(BaseModel):
    """Response body for POST /chat."""

    reply: str


class HealthResponse(BaseModel):
    """Response body for GET /health."""

    status: str
    service: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/", include_in_schema=False)
async def root() -> RedirectResponse:
    """Redirect browser visits to the interactive API docs."""
    return RedirectResponse(url="/docs")


@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Liveness probe",
    tags=["Utility"],
)
async def health_check() -> HealthResponse:
    """
    Liveness probe consumed by load balancers, Docker HEALTHCHECK, and CI/CD
    pipelines.  Returns HTTP 200 while the service is running.
    """
    return HealthResponse(status="ok", service="CartPilot API")


@app.get(
    "/products",
    summary="List or search the product catalog",
    tags=["Products"],
    response_description="Array of product objects matching the query.",
)
async def get_products(
    q: Optional[str] = Query(
        default=None,
        min_length=1,
        description=(
            "Optional full-text search term. Matches against product "
            "name and category (case-insensitive)."
        ),
    ),
) -> list[dict]:
    """
    Return the full product catalog, or a filtered subset when **q** is given.

    The filter matches any product whose ``name`` **or** ``category`` contains
    the query string (case-insensitive substring match).
    """
    if not q:
        return _products

    query = q.lower()
    results = [
        p
        for p in _products
        if query in p["name"].lower() or query in p["category"].lower()
    ]
    logger.info("Product search q='%s' → %d result(s)", q, len(results))
    return results


@app.post(
    "/chat",
    response_model=ChatResponse,
    summary="Chat with the CartPilot AI assistant",
    tags=["Chat"],
    responses={
        400: {"description": "Blank or whitespace-only message."},
        502: {"description": "Upstream LLM API error."},
        503: {"description": "LLM service temporarily unavailable."},
    },
)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Forward the user's message to Google Gemini and return the assistant reply.

    Validation errors (blank message) automatically return HTTP 422.
    Gemini API failures are mapped to HTTP 502 / 503.
    """
    logger.info("Chat ← '%.100s'", request.message)

    try:
        reply = await get_chat_reply(request.message)

    except RuntimeError as exc:
        # Empty or blocked Gemini response
        logger.warning("Gemini returned an empty/blocked response: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="The AI assistant returned an empty response. Please try again.",
        ) from exc

    except Exception as exc:
        # Catch-all for google-genai SDK errors (auth, quota, network, etc.)
        err_type = type(exc).__name__
        err_msg = str(exc)
        logger.error("Gemini API error [%s]: %s", err_type, err_msg)

        # Rate-limiting / quota exhausted: gracefully fall back to structured catalog data (200 OK)
        if any(term in err_msg.lower() for term in ["quota", "rate", "429", "resource_exhausted", "unavailable", "503"]):
            logger.warning("Serving structured catalog fallback response due to LLM rate-limit / quota: %s", err_msg)
            fallback_reply = get_catalog_fallback_reply(request.message)
            return ChatResponse(reply=fallback_reply)

        if "api_key" in err_msg.lower() or "invalid" in err_msg.lower() or "unauthenticated" in err_msg.lower():
            raise HTTPException(
                status_code=502,
                detail="LLM authentication failed. Check GEMINI_API_KEY.",
            ) from exc

        raise HTTPException(
            status_code=502,
            detail="The AI service returned an unexpected error. Please try again later.",
        ) from exc

    logger.info("Chat → reply generated (%.80s…)", reply)
    return ChatResponse(reply=reply)

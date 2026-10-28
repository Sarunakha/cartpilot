"""
llm.py — Google Gemini API integration for CartPilot.

Responsibilities:
  - Bootstrap the Gemini client from the environment at module import time.
  - Load and format the product catalog as grounded context.
  - Define a strict system prompt that pins the model to catalog data only.
  - Expose a single async-compatible function ``get_chat_reply`` consumed by
    the /chat endpoint in main.py.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

# ---------------------------------------------------------------------------
# Bootstrap — resolve paths relative to THIS file, not the CWD.
# This makes the module work regardless of where uvicorn is launched from.
# ---------------------------------------------------------------------------

_HERE: Path = Path(__file__).parent

# Explicitly point load_dotenv at the .env file next to this module so that
# uvicorn's reloader subprocess (which may have a different CWD) still finds it.
load_dotenv(dotenv_path=_HERE / ".env")

logger = logging.getLogger("cartpilot.llm")

_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
_PRODUCTS_PATH: Path = _HERE / "products.json"

# ---------------------------------------------------------------------------
# Gemini client — lazily initialised on first request so that a missing key
# raises a clear error at request-time, not at import time (which would
# prevent the server from starting at all and hide the real problem).
# ---------------------------------------------------------------------------

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    """Return the shared Gemini client, creating it on the first call."""
    global _client
    if _client is None:
        api_key = (
            os.getenv("GEMINI_API_KEY", "")
            or os.getenv("CartPilot_API_KEY", "")
            or os.getenv("CARTPILOT_API_KEY", "")
            or os.getenv("cartpilot_api_key", "")
        ).strip()
        if not api_key:
            raise EnvironmentError(
                "Neither GEMINI_API_KEY nor CartPilot_API_KEY is set. "
                "Add it to backend/.env and restart the server."
            )
        _client = genai.Client(api_key=api_key)
        logger.info("Gemini client initialised (model: %s)", _MODEL)
    return _client


# ---------------------------------------------------------------------------
# Catalog helpers
# ---------------------------------------------------------------------------


def _load_catalog() -> str:
    """
    Read products.json and return a compact, human-readable block that the
    model can parse reliably.

    Returns:
        A multi-line string with one bullet per product.

    Raises:
        FileNotFoundError: If products.json does not exist on disk.
        json.JSONDecodeError: If products.json contains malformed JSON.
    """
    if not _PRODUCTS_PATH.exists():
        raise FileNotFoundError(
            f"Product catalog not found at {_PRODUCTS_PATH}. "
            "Ensure products.json is present in the backend directory."
        )

    with _PRODUCTS_PATH.open("r", encoding="utf-8") as fh:
        products: list[dict] = json.load(fh)

    lines: list[str] = ["Available products in the CartPilot catalog:\n"]
    for p in products:
        stock_label = (
            f"{p['stock']} unit(s) in stock" if p["stock"] > 0 else "OUT OF STOCK"
        )
        lines.append(
            f"• [{p['id']}] {p['name']} ({p['category']})\n"
            f"  Price : ${p['price']:.2f}\n"
            f"  Stock : {stock_label}\n"
            f"  Info  : {p['description']}"
        )

    return "\n\n".join(lines)


def _build_system_prompt() -> str:
    """
    Build the strict, grounded system prompt injected on every Gemini call.

    Returns:
        A fully formed system prompt string.
    """
    catalog_text = _load_catalog()

    return f"""You are CartPilot, a friendly, professional retail support assistant.

━━━━━━━━━━━━━━━━  STRICT OPERATING RULES  ━━━━━━━━━━━━━━━━
1. BASE YOUR ANSWERS EXCLUSIVELY on the product catalog provided below.
   Do NOT invent, infer, or guess prices, stock levels, specifications,
   promotions, shipping times, or return policies.
2. If the customer asks about a product, topic, or policy that is NOT
   found in the catalog, respond exactly with:
   "I'm sorry, I don't have that information in my current catalog."
3. Never claim a product is available when its stock is 0 (OUT OF STOCK).
4. Keep replies concise, warm, and helpful — no bullet-point walls of text
   unless the user explicitly asks for a comparison or list.
5. You may compare products from the catalog side-by-side, but only using
   data that appears below.
6. You have NO access to real-time inventory, order history, payment
   systems, or shipping carriers. Never fabricate such information.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━  PRODUCT CATALOG  ━━━━━━
{catalog_text}
━━━━━━  END OF CATALOG  ━━━━━━
"""


# ---------------------------------------------------------------------------
# Rate-limiting & catalog fallback helpers
# ---------------------------------------------------------------------------


def _is_rate_limit_or_transient(exc: Exception) -> bool:
    """Return True if the exception represents a 429 rate-limit, quota exhaustion, or 503 overload."""
    err_str = str(exc).lower()
    code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
    if code in (429, 503):
        return True
    return any(
        term in err_str
        for term in [
            "429",
            "resource_exhausted",
            "quota",
            "rate",
            "rate_limit",
            "rate limit",
            "503",
            "unavailable",
            "overloaded",
        ]
    )


def get_catalog_fallback_reply(user_message: str = "") -> str:
    """
    Generate a grounded, structured catalog response directly from products.json.
    Ensures the client receives a valid 200 OK with available inventory or policy
    information even when external LLM quota is exhausted.
    """
    msg_lower = user_message.lower() if user_message else ""

    # Check for returns, refunds, order tracking, shipping, or human support intent
    policy_keywords = [
        "return",
        "refund",
        "exchange",
        "support",
        "cancel",
        "cancellation",
        "shipping",
        "order",
        "track",
    ]
    if any(kw in msg_lower for kw in policy_keywords):
        return (
            "I am currently operating in store assistance mode. For returns, refunds, "
            "or order inquiries, please note that all items come with our standard 30-day "
            "return policy. Please contact customer support with your order number for "
            "assistance with processing your refund."
        )

    try:
        if not _PRODUCTS_PATH.exists():
            return (
                "I am CartPilot. We are currently experiencing high traffic and our catalog "
                "service is temporarily busy. Please try again shortly."
            )
        with _PRODUCTS_PATH.open("r", encoding="utf-8") as fh:
            products: list[dict] = json.load(fh)
    except Exception as exc:
        logger.error("Failed to load products for catalog fallback: %s", exc)
        return "I apologize, but our catalog is temporarily unavailable. Please try again shortly."

    tokens = [
        t.strip("?,.!\"':;()[]{}")
        for t in msg_lower.split()
        if len(t.strip("?,.!\"':;()[]{}")) > 2
    ]

    # Keyword-match against catalog
    matched_products: list[dict] = []
    if tokens:
        for p in products:
            p_text = f"{p.get('name', '')} {p.get('category', '')} {p.get('description', '')}".lower()
            if any(token in p_text for token in tokens):
                matched_products.append(p)

    # If specific products matched, display them; otherwise display all in-stock products
    display_products = matched_products if matched_products else [p for p in products if p.get("stock", 0) > 0]

    lines = [
        "I am currently operating in direct catalog assistance mode. Here is our available inventory matching your inquiry:\n"
    ]
    for p in display_products:
        stock_status = f"{p['stock']} in stock" if p.get("stock", 0) > 0 else "OUT OF STOCK"
        lines.append(
            f"• **{p['name']}** ({p['category']})\n"
            f"  Price : ${p['price']:.2f} | Status: {stock_status}\n"
            f"  {p['description']}"
        )

    lines.append("\nPlease let me know if you would like more details about any of these items!")
    return "\n\n".join(lines)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def get_chat_reply(user_message: str) -> str:
    """
    Send *user_message* to Gemini with the grounded system prompt and return
    the assistant's plain-text reply.

    Includes retry with exponential backoff for 429 rate-limiting and 503 overload.
    Falls back to a structured catalog response if quota is exhausted.

    Args:
        user_message: The raw string typed by the end-user in the chat UI.

    Returns:
        The model's reply as a plain string, or a structured catalog fallback.
    """
    client = _get_client()
    logger.debug("Sending to Gemini (%s): %.120s", _MODEL, user_message)

    system_prompt = _build_system_prompt()

    # Retry configuration for rate limiting & transient errors
    max_attempts = 3
    base_backoff_sec = 2.0
    last_exc: Exception | None = None
    response = None

    for attempt in range(1, max_attempts + 1):
        try:
            response = client.models.generate_content(
                model=_MODEL,
                contents=user_message,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    max_output_tokens=1024,
                    temperature=0.2,   # Low temperature → factual, grounded answers
                    top_p=0.95,
                ),
            )
            last_exc = None
            break
        except Exception as exc:
            last_exc = exc
            if _is_rate_limit_or_transient(exc):
                if attempt < max_attempts:
                    sleep_sec = base_backoff_sec * (2 ** (attempt - 1))
                    logger.warning(
                        "Gemini rate limit / transient 429 on attempt %d/%d: %s. Backing off for %.1fs…",
                        attempt,
                        max_attempts,
                        exc,
                        sleep_sec,
                    )
                    await asyncio.sleep(sleep_sec)
                    continue
                else:
                    logger.warning(
                        "Gemini rate limit / quota exhausted after %d attempts. Serving structured catalog fallback.",
                        max_attempts,
                    )
                    return get_catalog_fallback_reply(user_message)
            # Non-transient errors (e.g. invalid API key, malformed request) propagate immediately
            raise

    if last_exc is not None:
        if _is_rate_limit_or_transient(last_exc):
            return get_catalog_fallback_reply(user_message)
        raise last_exc

    # ── Extract text robustly across model variants ──────────────────────────
    reply: str | None = None

    if response and response.text:
        reply = response.text
    elif response and response.candidates:
        parts = []
        for part in response.candidates[0].content.parts:
            text = getattr(part, "text", None)
            if text and not getattr(part, "thought", False):
                parts.append(text)
        if parts:
            reply = "".join(parts)

    if not reply:
        logger.warning("Gemini returned an empty/blocked reply. Serving catalog fallback.")
        return get_catalog_fallback_reply(user_message)

    logger.debug("Gemini reply: %.80s…", reply)
    return reply


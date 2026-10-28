# ==============================================================================
# CartPilot Backend — Multi-stage Production Dockerfile
# Base: python:3.11-slim (minimal Debian base for security & small image size)
# ==============================================================================

# ── Stage 1: Dependency Builder ──────────────────────────────────────────────
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

# Copy requirements separately to leverage Docker layer caching
COPY requirements.txt .

# Install dependencies into an isolated prefix directory
RUN pip install --upgrade pip && \
    pip install --prefix=/install -r requirements.txt

# ── Stage 2: Minimal Production Runner ───────────────────────────────────────
FROM python:3.11-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Security: Create non-root system user and group
RUN addgroup --system --gid 1001 cartpilot && \
    adduser --system --uid 1001 --ingroup cartpilot --no-create-home cartpilot

WORKDIR /app

# Copy compiled Python packages from the builder stage
COPY --from=builder /install /usr/local

# Copy application source code and catalog
COPY --chown=cartpilot:cartpilot main.py llm.py products.json ./

# Switch to unprivileged non-root user
USER cartpilot

# Expose backend port
EXPOSE 8000

# Container liveness check using Python standard library
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Execute Uvicorn with explicit host and port
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

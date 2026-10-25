# CartPilot: AI Support Assistant for E-commerce

A full-stack assistant that answers product questions, looks up orders and explains return
policies. Planned: a LangGraph agent that picks the right tool and asks for human
confirmation before changing or cancelling an order.

> Status: starter scaffold (Week 1). See `TASKS.md` for the roadmap.

## Tech stack
- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide, Vitest + React Testing Library
- **Backend:** Python, FastAPI, Pydantic
- **AI (planned):** Any OpenAI-compatible LLM (Gemini, Groq, Ollama; Claude API optional), tool calling, RAG, LangChain, LangGraph, LangSmith
- **Data:** synthetic products and orders (SQLite/Postgres planned)
- **Tooling:** pytest, GitHub Actions (planned), Vercel + Render (planned)

## Run locally

Backend:
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload        # http://localhost:8000/docs
pytest
```

Frontend:
```bash
cd frontend
npm install
npm run dev                      # http://localhost:3000
```

## Architecture (target)
```
Next.js chat UI → FastAPI /chat → LangGraph agent
                                   ├─ search_products → DB
                                   ├─ lookup_order    → DB
                                   ├─ search_policy   → vector store (RAG)
                                   └─ cancel_order    → requires human approval
```

## Trade-offs and limitations
_Fill in as you build._

## Safety
Only synthetic data is used. No secrets are committed; copy `.env.example` to `backend/.env`.
# cartpilot

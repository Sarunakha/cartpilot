# CartPilot: 90-day task list (Oct 20, 2026 → mid-Jan 2027)

Rule: every week ends with something that runs. Cut scope, not deadlines.
Work on a branch per task and merge through a pull request.

## Week 1–2: Foundation
- [x] Run the backend and the frontend; see the chat work end to end
- [x] Chat UI: auto-scroll, loading indicator, error banner with Retry, validation, Tailwind styling
- [x] Frontend tests (Vitest + React Testing Library): 37 passing
- [ ] Open your first PR with a clear description

## Week 3–4: Backend + LLM
- [ ] Move data from `data.py` into SQLite/Postgres
- [ ] Call the LLM API from `/chat` with timeouts + error handling
- [ ] Answer product questions using the products table
- [ ] Add pytest tests (mock the LLM call)

## Week 5–6: Tool calling + ReAct
- [ ] Write a framework-free loop: reason → call tool → observe → answer
- [ ] Tools: `search_products`, `lookup_order`; max 5 steps
- [ ] Rebuild with LangChain and compare

## Week 7–8: LangGraph + RAG + tracing
- [ ] Write 5–10 FAQ/return-policy docs in `docs/policies/`
- [ ] Chunk, embed, store (Chroma or pgvector); add `search_policy` tool
- [ ] LangGraph agent: router, tools, retries, stop condition
- [ ] Human approval before cancelling/changing an order
- [ ] Turn on LangSmith tracing

## Week 9–10: Deploy
- [ ] Frontend → Vercel, backend → Render/Railway/Fly.io
- [ ] Env vars set; no secrets in the repo
- [ ] Run 5 realistic conversations end to end

## Week 11: Quality
- [ ] GitHub Actions: run tests on every push
- [ ] Evaluation file of 15–20 questions + expected tools; script prints pass rate
- [ ] README: architecture diagram, screenshots/demo video, trade-offs, limitations

## Week 12: Career
- [ ] Resume headline + project bullets (what *you* built)
- [ ] 3-minute project walkthrough; 2 recorded mock interviews
- [ ] Book one certification; start/continue applying

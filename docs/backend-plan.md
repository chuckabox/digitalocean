# Wavelength Backend — Production Build Plan

> Building the **real** backend from first principles. The old `debrief/` Python service
> was a throwaway test and has been removed — do not reference its contract. This plan is
> the source of truth for backend work.
>
> **Status (2026-07-12):** Phase 0 ✅ · Phase 1 ✅ · Phase 2 ✅ · Phase 3 ✅ · Phase 4 code ✅.
> **App Platform live URL pending** (create from `.do/app.yaml`). Guide: [phase-4.md](./phase-4.md).
> Live team status: [STATUS.md](../STATUS.md).

## Decisions (locked)

- **Monorepo:** `client/` (React/Vite) + `server/` (Node/Express, TypeScript) + `shared/`
  (Zod contract). npm workspaces: `["client","server","shared"]`.
- **One deployable:** the Express service serves the client build *and* owns all
  DigitalOcean access. The inference key never reaches the browser.
- **Perception is client-side** (MediaPipe) — only derived signal features + transcript
  text reach the server. Raw video/audio never leaves the laptop.
- **No user auth yet; CORS locked** to the frontend origin. Auth is a later phase.
- **Build in phases, not one loop.** Each phase ends green (typechecks + tests pass) and
  leaves a working increment. A verification spike (Phase 0) de-risks the external
  unknowns before any domain logic is written.

## Stack (opinionated defaults = the fundamentals)

| Concern | Choice | Why |
|---|---|---|
| Runtime | Node 20 LTS, **TypeScript strict**, ESM | Type safety end-to-end |
| HTTP | **Express 5** | Simple; Fastify is the alt if we want built-in schema/perf |
| Validation | **Zod** — schemas in `shared/`, types *inferred* | One source of truth for the wire contract; validate at the boundary |
| DB | **Postgres + Drizzle ORM** | Type-safe queries + first-class migrations |
| LLM | **OpenAI SDK → DO base_url**, forced tool-calling for JSON | DO is OpenAI-compatible; tool-calling is the reliable structured-output path |
| Logging | **Pino** (structured, request-scoped) | Real observability |
| Tests | **Vitest + Supertest** | Unit services + integration routes |
| Config | **Zod-validated env**; secrets via DO App Platform | Fail fast on misconfig; key never in code |
| Deploy | Docker → **DO App Platform**, migrations on release, CI on push | Reproducible; key stays server-side |

## Architecture — clean layering (each layer knows only the one below)

```
HTTP        routes + zod validation + consistent error envelope
  → Services   domain logic; deterministic metrics; prompt assembly
     → Repositories   Drizzle — the ONLY place SQL lives
     → Clients        Gradient wrapper: chat, stream (SSE), structured (tool-call+repair), retries
Cross-cutting: config, logger, typed errors, request-id middleware
shared/ : zod schemas + inferred types = the contract client & server agree on
```

**Baked in from line one:** validation at every boundary, one error envelope, CORS
locked (not `*`), request IDs in logs, no secrets in logs, timeouts + retries on every
outbound DO call, and a graceful fallback when inference fails.

**Today (Phases 0–4 code):** repositories + Gradient client + services + `/v1` routes
(sessions, frames, nudge, SSE debrief) + rate limits + static SPA + Docker/App Platform
spec + CI. Progress/history deferred. **Live App Platform URL pending.**

## What exists on disk (Phases 0–4)

```
Dockerfile · .dockerignore · .do/app.yaml · .github/workflows/ci.yml

shared/src/
├── domain/signals.ts
└── contracts/           # session · frames · nudge · debrief

server/
├── docker-entrypoint.sh
└── src/
    ├── index.ts · app.ts · spike.ts · logger.ts · errors.ts
    ├── config/env.ts        # + CLIENT_DIST, MIGRATIONS_DIR
    ├── http/middleware/     # requestId · errorHandler · cors · rateLimit
    ├── http/static.ts · parse.ts · mappers.ts
    ├── http/routes/         # health · sessions · frames · nudge · debrief
    ├── services/            # metrics · nudge · debrief · fallbacks
    ├── repositories/        # sessions · frames
    ├── db/
    └── clients/gradient.ts
```

**Env (see `config/env.ts`):** `DIGITAL_OCEAN_MODEL_ACCESS_KEY`, `DO_INFERENCE_BASE_URL`,
`MODEL_FAST` / `MODEL_SMART`, `DATABASE_URL`, `CORS_ORIGIN`, `PORT` (default 8080),
`CLIENT_DIST`, `MIGRATIONS_DIR`.

**Commands:** `npm run build -w shared` · `npm test` · `npm run db:migrate -w server` ·
`npm run spike -w server` · `npm run test:integration -w server` · `npm run build`.

Handoff for deploy agents: [agent-handoff.md](./agent-handoff.md).

## Phases

Each phase ends green and is independently testable.

### Phase 0 — Foundation + spike ✅ DONE
- Scaffold `server/` + `shared/`: TS strict, Express, Pino, Zod, Drizzle, Vitest,
  Zod-validated env, `/health` + `/ready`.
- **SPIKE (before any domain code), with the real DO key:**
  1. `GET /v1/models` — confirm the exact model-name strings (do not trust docs/memory).
  2. One chat completion succeeds.
  3. One **forced tool-call** returns schema-valid JSON (this is our structured-output path).
  4. Postgres connects; a trivial migration applies.
- **Gate:** if any of these behave differently than assumed, we adjust the plan now.
- **Verified:** 74 models; Haiku + Sonnet IDs locked; tool-calling works; Postgres 16.14.

### Phase 1 — Data layer ✅ DONE
- Drizzle schema + migrations: **`sessions`, `frames` shipped.**
  (`moments` / pgvector were optional stretch — **not implemented**.)
- Repositories with typed queries; integration-tested against live Managed Postgres.
- Tables: `sessions` (id, created_at, ended_at, context); `frames` (session_id, t,
  engagement/valence/attention, signals jsonb, confidence, index on `(session_id, t)`).

### Phase 2 — Gradient client ✅ DONE
Typed wrapper in `server/src/clients/gradient.ts` (the one place the app talks to an LLM).
OpenAI SDK → `DO_INFERENCE_BASE_URL`; SDK `maxRetries: 2`, default timeout 30s.

| Export | Behavior |
|---|---|
| `chat(opts)` | Non-streaming completion → assistant text. Default tier `fast`, `maxTokens` 512. |
| `stream(opts)` | Async generator of text deltas (debrief SSE). Default tier `smart`, `maxTokens` 1024. |
| `structured(schema, opts)` | Forced `tool_choice` + Zod parse; `maxAttempts` default 2 (1 try + 1 repair). Default tier `fast`, `maxTokens` 800. Uses `zod-to-json-schema` (`openApi3`, no `$ref`). |
| `extractValidJson(schema, attempt, maxAttempts)` | Repair-loop helper — unit-tested without the network. |
| `listModels()` | Returns model id strings from DO. |

**Options:** `tier?: 'fast' \| 'smart'`, `system?`, `prompt?`, `messages?`, `maxTokens?`,
`temperature?`, `timeoutMs?`. Per-request options are **omitted** when `timeoutMs` is unset
(passing `{ timeout: undefined }` makes the SDK reject).

**Verified:** hermetic unit tests (repair: valid-first-try, schema-repair, malformed-JSON,
exhaustion→throw) + live integration (`chat`, `structured`, `stream`, `listModels`).

**Still Phase 4+ service polish:** canned fallbacks already live in services; App Platform
live URL still pending.

### Phase 3 — Domain services + endpoints (fresh `/v1` contract) ✅ DONE
- Shared contracts wired (`server` depends on `shared`).
- Services: `metrics` (deterministic), `nudge` (`structured` + canned fallback),
  `debrief` (`stream` → SSE + canned fallback).
- Routes under `/v1`: sessions, frames, nudge, debrief. Progress/history **deferred**.
- Hermetic tests: metrics, nudge/debrief fallbacks, route Zod validation + SSE.

### Phase 4 — Hardening + deploy ✅ CODE DONE (live URL pending)
- Rate limiting on `/v1` (stricter on nudge/debrief); `trust proxy` for App Platform.
- Express serves `CLIENT_DIST` with SPA fallback.
- Root `Dockerfile` + `server/docker-entrypoint.sh` (migrate → start); `.dockerignore`.
- `.do/app.yaml` + GitHub Actions CI (typecheck + hermetic tests).
- **Still do:** create App Platform app, set secrets, smoke live URL — [phase-4.md](./phase-4.md).

## Cut order under time pressure
pgvector / semantic recall → progress/history → frame persistence. **Never cut** the
debrief endpoint or the live nudge endpoint — they are the demo.

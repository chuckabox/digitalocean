# Agent handoff — current reality (2026-07-12)

> **Read this + [STATUS.md](../STATUS.md) before changing anything.**
> This is what a fresh agent needs to know after Phases 0–4 code landed on `main`.

## One-sentence status

Backend is **feature-complete for the demo API** and **live on App Platform**:
https://wavelength-wxut4.ondigitalocean.app. Client UI is **not wired** to `/v1`.

## What shipped (do not rebuild)

| Phase | Status | Where |
|---|---|---|
| 0 Foundation + spike | ✅ | `server/` env, Pino, CORS, `/health` `/ready`, `spike.ts` |
| 1 Data layer | ✅ | Drizzle `sessions`/`frames`, repos, migrations |
| 2 Gradient client | ✅ | `server/src/clients/gradient.ts` — `chat` / `stream` / `structured` / `listModels` |
| 3 `/v1` API | ✅ | `shared/contracts` + services + routes |
| 4 Harden + package | ✅ live | rate limit, static SPA, Dockerfile, `.do/app.yaml`, CI, App Platform |

**Branch:** work is on `main` (commits through Phase 4 artifacts).

### `/v1` contract (live locally)

| Method | Path | Notes |
|---|---|---|
| `POST` | `/v1/sessions` | `{ context? }` |
| `GET` | `/v1/sessions/:id` | |
| `POST` | `/v1/sessions/:id/end` | |
| `POST` | `/v1/frames` | `{ sessionId, frames: SignalFrame[] }` |
| `GET` | `/v1/sessions/:id/frames` | |
| `POST` | `/v1/nudge` | `structured` + canned fallback |
| `POST` | `/v1/debrief` | SSE `{type:delta\|done\|error}` via `stream` |

Never cut nudge or debrief. Progress/history **deferred**.

### Gradient reliability notes (already fixed)

- Do **not** pass `{ timeout: undefined }` to the OpenAI SDK — omit options unless set.
- `structured()` = forced tool-call → Zod → 1 repair retry (`extractValidJson`).
- Models: `anthropic-claude-haiku-4.5` (fast), `anthropic-claude-4.6-sonnet` (smart).
- `llama3.3-70b-instruct` often 404s on this account — ignore catalog folklore.

### Layering

```
routes (Zod) → services → repositories (Drizzle) → clients/gradient
shared/ = wire contract (build shared → dist before server typecheck/test)
```

## What's NOT done (your likely job)

1. **Wire `client/` → `/v1`** (Peter) — UI still uses offline fixtures in
   `client/src/data/sessions.ts`.
2. **MediaPipe LIVE loop** against `/v1` (Dinil).
3. Tear down defunct `wavelength-brain-37j5z.ondigitalocean.app`.
4. Link GitHub OAuth on the DO account if you want `deploy_on_push` (app currently uses
   public `git` clone + manual redeploy).

## DigitalOcean MCP (Cursor)

User-level Cursor MCP is configured at `~/.cursor/mcp.json` (not in git — contains API token):

- `digitalocean-apps` → `https://apps.mcp.digitalocean.com/mcp`
- `digitalocean-databases` → `https://databases.mcp.digitalocean.com/mcp`
- `digitalocean-spaces` / `digitalocean-droplets` / `digitalocean-insights`

**After reload**, agents can list/create App Platform apps and databases via MCP.
Do **not** commit tokens. Prefer MCP over inventing `doctl` if MCP is available.

Claude Code already had the same servers for this project under `~/.claude.json`
(project entry `/Users/cs/dev/digitalocean`).

## Commands

```bash
npm run build -w shared          # required before server typecheck/test (exports → dist)
npm run typecheck -w server
npm test                         # root: build shared + hermetic server tests
npm test -w server
npm run test:integration -w server   # needs DATABASE_URL / inference key
npm run db:migrate -w server
npm run spike -w server
npm run build                    # shared + client + server
```

Env template: [`server/.env.example`](../server/.env.example).
Runtime secrets for App Platform: `DIGITAL_OCEAN_MODEL_ACCESS_KEY`, `DATABASE_URL`,
`CORS_ORIGIN`, plus `CLIENT_DIST` / `MIGRATIONS_DIR` (set in Dockerfile / app.yaml).

## Deploy checklist (short)

1. Discover DO MCP tools; `list_apps` / list DBs — **do not** reuse `wavelength-brain-*`.
2. Create app from Dockerfile at repo root (spec: `.do/app.yaml`).
3. Set secrets; bind Managed Postgres if already provisioned.
4. Smoke: `/health`, `/ready`, `POST /v1/sessions`, `/v1/nudge`, `/v1/debrief` SSE, `GET /`.
5. Update STATUS.md with live URL; mark Phase 4 fully done only if smoke passes.

Full steps: [phase-4.md](./phase-4.md).

## Obsolete docs (banner only — do not follow)

- [INTEGRATION.md](./INTEGRATION.md) — old Python API / “don’t build Express”
- [ALIGNMENT.md](./ALIGNMENT.md) — pre-pivot decisions
- [demo-runsheet.md](./demo-runsheet.md) — Python venue checklist

## Security

Tokens and model keys have appeared in chat / local MCP configs. **Rotate after the event.**
Never commit `.env`, tokens, or `~/.cursor/mcp.json`.

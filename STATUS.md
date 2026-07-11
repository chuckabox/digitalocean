# Wavelength — Team Status & Decisions

> Single source of truth. Updated 2026-07-12. If you read one file, read this.
> Fresh agents: also read [docs/agent-handoff.md](./docs/agent-handoff.md).
> Product (public framing): **Wavelength** — a consented social co-pilot for neurodivergent
> people. Reads the *trajectory* of a conversation, nudges gently, debriefs kindly.
> (North-star vision behind it: [docs/north-star.md](./docs/north-star.md).)

---

## ⚠️ Pivot — read this first (2026-07-12)
We decided to build the **real production backend from first principles** instead of keeping
the earlier throwaway test backend.
- **`debrief/` (the old Python API) was removed** from the repo, and its database tables were
  dropped.
- The deployed app **`wavelength-brain-37j5z.ondigitalocean.app` is now defunct** (its tables
  are gone) and should be torn down.
- **Consequence:** Client wiring to `/v1` is on `dinil-main` (redeploy to ship). API is live on App Platform.
- The new backend lives in **`server/`** (TypeScript/Express), the shared contract in
  **`shared/`** (Zod). Full plan: [docs/backend-plan.md](./docs/backend-plan.md).
- **Do not follow** [docs/INTEGRATION.md](./docs/INTEGRATION.md) or [docs/ALIGNMENT.md](./docs/ALIGNMENT.md)
  — those are pre-pivot / obsolete.

## TL;DR
**Backend Phases 0–4 are done** (live App Platform). **Client → `/v1` wiring Phases 0–7
landed on `dinil-main`** (consent → live → debrief, MediaPipe + synthetic, nudge, SSE).
Redeploy App Platform to pick up the new client build.

**Live URL:** https://wavelength-wxut4.ondigitalocean.app

## Backend status (new `server/`)
- **Phase 0 — foundation + spike: DONE.** Zod-validated env, Pino logging, typed errors,
  CORS-locked, `/health` + `/ready`. Spike verified live on DO: 74 models (incl. the two below),
  chat completion, **forced tool-calling** (our structured-output path), Postgres 16.14 reachable.
- **Phase 1 — data layer: DONE.** Drizzle schema (`sessions`, `frames` only — no `moments`/pgvector)
  migrated to Managed Postgres; typed repositories; integration tests green against the live DB.
- **Phase 2 — Gradient client: DONE.** Typed wrapper in `server/src/clients/gradient.ts`:
  - `chat()` — one-shot completions (default tier `fast`)
  - `stream()` — async-generator text deltas for debrief SSE (default tier `smart`)
  - `structured(zodSchema, …)` — forced tool-call → Zod validate → one repair retry (reliability core)
  - `listModels()` — catalog probe
  - Verified live against DO (integration) + hermetic unit tests for the repair loop
  - Dep: `zod-to-json-schema`. Do **not** pass `{ timeout: undefined }` to the OpenAI SDK
    (omit request options unless `timeoutMs` is set).
- **Phase 3 — `/v1` endpoints: DONE.** Shared Zod contracts; services (metrics, nudge, debrief +
  canned fallbacks); routes mounted under `/v1`:
  | Method | Path | Notes |
  |---|---|---|
  | `POST` | `/v1/sessions` | start session |
  | `GET` | `/v1/sessions/:id` | fetch one |
  | `POST` | `/v1/sessions/:id/end` | mark ended |
  | `POST` | `/v1/frames` | batch ingest |
  | `GET` | `/v1/sessions/:id/frames` | timeline replay |
  | `POST` | `/v1/nudge` | `structured` + canned fallback |
  | `POST` | `/v1/debrief` | SSE via `stream` + canned fallback |
  Progress/history deferred (cuttable). Hermetic unit tests cover metrics, fallbacks, route validation.
- **Phase 4 — harden + deploy: DONE (live).** Rate limit on `/v1`; SPA from Express; Docker +
  migrate entrypoint; App Platform app `wavelength` in sfo bound to `wavelength-db`.
  Smoke: `/health` `/ready` sessions nudge debrief SSE `/` HTML all green.
- **Models:** `anthropic-claude-haiku-4.5` (fast) and `anthropic-claude-4.6-sonnet` (sharper).
- **Commands:** `npm run build -w shared` · `npm test` · `npm run db:migrate -w server` ·
  `npm run spike -w server` · `npm run test:integration -w server` · `npm run build`.

## DigitalOcean MCP (for deploy agents)
Cursor user MCP (`~/.cursor/mcp.json`, not in git) mirrors Claude Code for this project:
`digitalocean-apps`, `digitalocean-databases`, `digitalocean-spaces`, `digitalocean-droplets`,
`digitalocean-insights`. Reload Cursor if tools are missing. Use MCP to create the app from
`.do/app.yaml` / Dockerfile — do **not** revive `wavelength-brain-37j5z`.

## Decisions LOCKED (don't reopen)
1. **Name: Wavelength.**
2. **3-state app: CONSENT → LIVE → DEBRIEF**, one page, one laptop, no mobile.
3. **Real-time nudges: IN** (Dinil's staging trick — partner can't see the screen).
4. **Stack: monorepo — `client/` (React/Vite) + `server/` (TS/Express) + `shared/` (Zod contract).**
   One deployable; the server holds the DO key and proxies inference; CORS locked (key never in
   the browser). *(Reverses the earlier "React calls a Python API, no Express proxy" decision.)*
5. **Modality: audio core, video supporting** — soft emotion probs allowed (hedged; never diagnose).
6. **Credits: fine.** $200 hackathon credit applied (expires Jul 14). Burn freely.
7. **Persistence: DO Managed Postgres** — provisioned and working (was "stuck"; now live).

## Decisions we still need
1. **Redeploy App Platform** so the live URL serves the wired client (code is on `dinil-main`).
2. **Tear down the old `wavelength-brain` DO app?** It's defunct now. Recommend yes.
3. **Repo tidy:** `main` still carries the old static prototype (`old/`, `styles/`, root
   `index.html`) and duplicate DO docs (`context/` vs `docs/`). Delete when someone wants it clean.
4. **Demo roles:** narrator, laptop driver, two skit actors (BUILD_PLAN §6).

## What's LEFT, by owner
- **All:** merge/redeploy `dinil-main` client wiring; two timed skit rehearsals; backup demo video.
- **Connor:** coordinate teardown of the old app; own pitch/demo.
- **Tuning:** venue thresholds via `?dipZ=&dipHold=&cooldown=`; synthetic via `?synthetic=1`.

## Known risks / loose ends
- **AI triage kit (2026-07-11):** AppError + Gradient + canned-fallback logs; hermetic session/frame route tests; client `eventEngine` unit tests (`npm test` runs server + client).
- Redeploy App Platform after merge so live serves the 5 Hz / mesh / emotion client.
- Old deployed app defunct (its tables were dropped) — tear it down.
- Web Speech + MediaPipe are Chrome-only — demo in real Chrome, controlled lighting.
- **Security:** DO API / model keys have appeared in chat and local MCP configs —
  **rotate after the event.** Never commit secrets.
- App Platform GitHub OAuth is **not** linked on this DO account — deploys use public
  `git` clone (manual `apps-update` / console redeploy after push; no `deploy_on_push`).

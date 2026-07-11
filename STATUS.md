# Wavelength — Team Status & Decisions

> Single source of truth. Updated 2026-07-12. If you read one file, read this.
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
- **Consequence:** the old guaranteed-working fallback demo (`debrief/live-demo.html`) went with
  it. We do not have a working end-to-end demo again until the new backend endpoints (Phase 3)
  and the frontend are wired. Plan the fallback accordingly.
- The new backend lives in **`server/`** (TypeScript/Express), the shared contract in
  **`shared/`** (Zod). Full plan: [docs/backend-plan.md](./docs/backend-plan.md).

## TL;DR
New production backend underway. **Phases 0–1 done and verified.** Frontend (`client/`) still
needs wiring to the new API — that's the critical path once Phase 3 lands the endpoints.

## Backend status (new `server/`)
- **Phase 0 — foundation + spike: DONE.** Zod-validated env, Pino logging, typed errors,
  CORS-locked, `/health` + `/ready`. Spike verified live on DO: 74 models (incl. the two below),
  chat completion, **forced tool-calling** (our structured-output path), Postgres 16.14 reachable.
- **Phase 1 — data layer: DONE.** Drizzle schema (`sessions`, `frames`) migrated to Managed
  Postgres; typed repositories; 5/5 integration tests green against the live DB.
- **Phase 2 — Gradient client: NEXT.** Typed `chat` / SSE `stream` / `structured` (tool-call+repair).
- **Phase 3 — endpoints (`/v1`), Phase 4 — deploy: pending.**
- **Models:** `anthropic-claude-haiku-4.5` (fast) and `anthropic-claude-4.6-sonnet` (sharper).
- **Commands:** `npm run spike -w server` · `npm run db:migrate -w server` · `npm test -w server`
  · `npm run test:integration -w server`.

## Decisions LOCKED (don't reopen)
1. **Name: Wavelength.**
2. **3-state app: CONSENT → LIVE → DEBRIEF**, one page, one laptop, no mobile.
3. **Real-time nudges: IN** (Dinil's staging trick — partner can't see the screen).
4. **Stack: monorepo — `client/` (React/Vite) + `server/` (TS/Express) + `shared/` (Zod contract).**
   One deployable; the server holds the DO key and proxies inference; CORS locked (key never in
   the browser). *(Reverses the earlier "React calls a Python API, no Express proxy" decision.)*
5. **Modality: audio core, video supporting** — never emotion labels (public framing).
6. **Credits: fine.** $200 hackathon credit applied (expires Jul 14). Burn freely.
7. **Persistence: DO Managed Postgres** — provisioned and working (was "stuck"; now live).

## Decisions we still need
1. **Who wires `client/` → the new API, and by when?** Still THE critical path (blocked until
   Phase 3 endpoints land, but assign the owner now).
2. **LIVE loop ambition** (MediaPipe → signals → event engine) vs. debrief-only fallback. Dinil
   owns the loop.
3. **Tear down the old `wavelength-brain` DO app?** It's defunct now. Recommend yes.
4. **Repo tidy:** `main` still carries the old static prototype (`old/`, `styles/`, root
   `index.html`) and duplicate DO docs (`context/` vs `docs/`). Delete when someone wants it clean.
5. **Demo roles:** narrator, laptop driver, two skit actors (BUILD_PLAN §6).

## What's LEFT, by owner
- **Dinil:** backend Phases 2–4, then the client-side LIVE MediaPipe loop against the new endpoints.
- **Peter:** wire `client/` to the new `/v1` API once Phase 3 lands it. Keep `sessions.ts` as
  offline fallback.
- **Connor:** coordinate teardown of the old app; own pitch/demo.
- **All:** two timed skit rehearsals; record a backup demo video (we currently have no working
  end-to-end fallback — see the pivot note).

## Known risks / loose ends
- **No working end-to-end demo right now** (old fallback removed; new one not built yet).
- Frontend not yet wired to the new backend.
- Old deployed app defunct (its tables were dropped) — tear it down.
- Web Speech + MediaPipe are Chrome-only — demo in real Chrome, controlled lighting.
- **Security:** a DO model access key was pasted in chat this session — **rotate it after the
  event.** Also rotate the earlier-exposed DO API token + `wavelength` model key.

# AGENTS.md

Instructions for coding agents working in this repo.

## Start here

1. **[STATUS.md](./STATUS.md)** — what exists, what's left, locked decisions.
2. **[docs/agent-handoff.md](./docs/agent-handoff.md)** — compact handoff for deploy / next work.
3. **[docs/backend-plan.md](./docs/backend-plan.md)** — phased backend SoT.
4. **[docs/phase-4.md](./docs/phase-4.md)** — how to deploy to App Platform.

## What we're building

**Wavelength** — a consented social co-pilot for one-on-one conversations. It reads
the *trajectory* of a conversation from the webcam and suggests, never diagnoses:
discreet hedged nudges live, an annotated timeline + AI debrief afterward.

This is a **one-day hackathon build**. Day schedule / demo script:
**[BUILD_PLAN.md](./BUILD_PLAN.md)** (paths/contract superseded by backend-plan — use `/v1`).

## Framing (read this)

Two framings, both true, held at once:

- **Public / hackathon face** — a consented social co-pilot that helps neurodivergent
  people ([docs/vision.md](./docs/vision.md)). This is what we pitch and demo. It is the
  prize strategy and the ethics moat: hedged, confidence-tagged, *suggest never diagnose*.
- **North star (the real vision)** — AI that can **see and understand people by looking
  at them**: emotion, body language, attention, tension, read from video and reasoned
  about over time ([docs/north-star.md](./docs/north-star.md)). The neurodivergent tool
  is the first honest *application* of this, not the ceiling.

It's an **experiment**. We know emotion/lie detection isn't validated science today —
that's the point. Show *capability* ("the machine reads and reasons"), never claim
*accuracy* ("this works"). Build the general perception engine; present the humane slice.

## Hard constraints

- **Runs entirely on DigitalOcean.** No other cloud.
- **Must use Gradient AI Inference** — this is required to be eligible for prizes.
- **May label soft emotion probabilities** (calm / happy / sad / tense / surprised /
  uncertain) from face cues — always as hedged relative probs, never as a diagnosis.
- **Privacy by architecture:** raw video/audio never leaves the laptop; only derived
  signal features and transcript text reach the backend.

## Where things are

- **[STATUS.md](./STATUS.md)** — team SoT. **Read first.**
- **[docs/agent-handoff.md](./docs/agent-handoff.md)** — current reality + deploy/MCP notes.
- **[docs/backend-plan.md](./docs/backend-plan.md)** — production backend plan (phases, stack).
- **[docs/phase-4.md](./docs/phase-4.md)** — harden + deploy implementation guide.
- **[BUILD_PLAN.md](./BUILD_PLAN.md)** — day schedule + demo script.
- **[docs/vision.md](./docs/vision.md)** · **[docs/north-star.md](./docs/north-star.md)** ·
  **[docs/hackathon-goals.md](./docs/hackathon-goals.md)**
- **[docs/digitalocean.md](./docs/digitalocean.md)** — DO capabilities + MCP endpoints.
- **`.agents/skills/digitalocean-ai/`** — DO Inference skill (deep reference).

> **Obsolete — do not follow:** [docs/INTEGRATION.md](./docs/INTEGRATION.md),
> [docs/ALIGNMENT.md](./docs/ALIGNMENT.md), [docs/demo-runsheet.md](./docs/demo-runsheet.md)
> (pre-pivot Python `debrief/` era). The old `debrief/` backend has been removed.

## Architecture

One monorepo, **one deployable**: Express (TypeScript) serves the React client *and* owns
all DigitalOcean access — the inference key never reaches the browser. Perception is
**client-side** (MediaPipe); LLM + Postgres sit behind the server.

> The old `debrief/` Python backend was a throwaway test and has been removed. Do not
> reference its contract. Fresh contract is `/v1` under `shared/contracts/`.

**Build status (2026-07-12):** Phase 0 ✅ · Phase 1 ✅ · Phase 2 ✅ · Phase 3 ✅ · Phase 4 ✅
**live** — https://wavelength-wxut4.ondigitalocean.app. Team status: [STATUS.md](./STATUS.md).

```
┌── Browser · React + MediaPipe (raw video/audio never leaves) ───────┐
│  getUserMedia → MediaPipe (~12Hz) → derived signals → 1Hz frames     │
│  deterministic event engine ──candidate──┐   Web Speech → transcript │
└──────────────── HTTPS / SSE ─────────────┼───────────────────────────┘
                                           ▼
┌── DO App Platform · Express (TS) · :8080 ─────────────────────────────┐
│  routes (zod) → services → repositories (Drizzle) → clients (Gradient)│
│  serves client build · holds DO key · CORS locked · rate limits       │
│  canned inference fallbacks · migrate on container start              │
└──────────┬──────────────────────────────────┬────────────────────────┘
           ▼                                   ▼
   DO Gradient AI Inference           DO Managed Postgres (Drizzle)
```

**Layering:** HTTP routes validate with Zod → services (metrics / nudge / debrief) →
repositories (Drizzle only) → `clients/gradient` (`chat` / `stream` / `structured`).
`shared/` = wire contract (build to `dist/` before server typecheck/test).

### Gradient client (`server/src/clients/gradient.ts`)

| Function | Use |
|---|---|
| `chat({tier, prompt/messages, …})` | one-shot completions (default tier `fast`) |
| `stream(…)` | async-generator text deltas → SSE debrief (default tier `smart`) |
| `structured(zodSchema, {toolName, …})` | forced tool-call + Zod + 1 repair retry |
| `listModels()` | catalog probe |

Models: `MODEL_FAST` = `anthropic-claude-haiku-4.5`, `MODEL_SMART` = `anthropic-claude-4.6-sonnet`.

### DigitalOcean MCP

Cursor has user-level DO MCP servers (`~/.cursor/mcp.json` — **not in git**). Use
`digitalocean-apps` / `digitalocean-databases` to deploy; details in
[docs/agent-handoff.md](./docs/agent-handoff.md). Reload Cursor if tools are missing.

## File structure (current)

```
wavelength/
├── package.json                 # workspaces: client, server, shared
├── Dockerfile · .dockerignore · .do/app.yaml
├── .github/workflows/ci.yml
├── AGENTS.md · STATUS.md · README.md · BUILD_PLAN.md · docs/
│
├── client/                      # React/Vite — NOT yet wired to /v1
├── shared/                      # domain + contracts → npm run build -w shared
└── server/
    ├── docker-entrypoint.sh     # migrate → node dist/index.js
    └── src/
        ├── index.ts · app.ts · spike.ts · logger.ts · errors.ts
        ├── config/env.ts        # + CLIENT_DIST, MIGRATIONS_DIR
        ├── http/
        │   ├── middleware/      # requestId · errorHandler · cors · rateLimit
        │   ├── static.ts · parse.ts · mappers.ts
        │   └── routes/          # health · sessions · frames · nudge · debrief
        ├── services/            # metrics · nudge · debrief · fallbacks
        ├── repositories/        # sessions · frames
        ├── db/                  # schema · client · migrate · migrations/
        └── clients/gradient.ts
```

**HTTP:** `/health`, `/ready`, `/v1/*`, static SPA when `CLIENT_DIST` set.

**Commands:** `npm run build -w shared` · `npm test` · `npm run db:migrate -w server` ·
`npm run spike -w server` · `npm run build`.

## Still open

- Peter: wire `client/` → `/v1`
- Dinil: MediaPipe LIVE loop
- Optional: `GET /v1/progress`
- Tear down defunct `wavelength-brain-37j5z`
- Link GitHub OAuth on DO for `deploy_on_push` (currently public git + manual redeploy)

**Priorities / cut order:** Never cut debrief or live nudge. Cut under pressure:
pgvector → progress/history → frame persistence.

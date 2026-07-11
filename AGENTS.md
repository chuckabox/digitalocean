# AGENTS.md

Instructions for coding agents working in this repo.

## What we're building

**Wavelength** — a consented social co-pilot for one-on-one conversations. It reads
the *trajectory* of a conversation from the webcam and suggests, never diagnoses:
discreet hedged nudges live, an annotated timeline + AI debrief afterward.

This is a **one-day hackathon build**. Day schedule / demo script:
**[BUILD_PLAN.md](./BUILD_PLAN.md)**. Live team status + locked decisions:
**[STATUS.md](./STATUS.md)** (read this first for "what exists now"). Backend plan:
**[docs/backend-plan.md](./docs/backend-plan.md)**.

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
- **Never label emotions.** Signal descriptors + hedged suggestions + confidence only.
- **Privacy by architecture:** raw video/audio never leaves the laptop; only derived
  signal features and transcript text reach the backend.

## Where things are

- **[STATUS.md](./STATUS.md)** — team SoT: phase status, locked decisions, owners. **Read first.**
- **[docs/backend-plan.md](./docs/backend-plan.md)** — production backend plan (phases, stack, on-disk tree).
- **[BUILD_PLAN.md](./BUILD_PLAN.md)** — day schedule + demo script (paths/contract superseded by backend-plan).
- **[docs/vision.md](./docs/vision.md)** — the public product vision (neurodivergent framing).
- **[docs/north-star.md](./docs/north-star.md)** — the real vision: machine perception of people.
- **[docs/hackathon-goals.md](./docs/hackathon-goals.md)** — judging criteria & target prizes.
- **[docs/digitalocean.md](./docs/digitalocean.md)** — DigitalOcean capabilities cheat-sheet.
- **`.agents/skills/digitalocean-ai/`** — installed DO Inference skill (deep reference).

> **Obsolete — do not follow:** [docs/INTEGRATION.md](./docs/INTEGRATION.md),
> [docs/ALIGNMENT.md](./docs/ALIGNMENT.md), [docs/demo-runsheet.md](./docs/demo-runsheet.md)
> (pre-pivot Python `debrief/` era). The old `debrief/` backend has been removed.

## Architecture

Production build, good fundamentals. One monorepo, **one deployable**: a Node/Express
(TypeScript) service that will serve the React client *and* owns all DigitalOcean access —
the inference key never reaches the browser. Perception runs **client-side** (MediaPipe);
the LLM and Postgres live behind the server. Full phased plan:
**[docs/backend-plan.md](./docs/backend-plan.md)**.

> The old `debrief/` Python backend was a throwaway test and has been removed. We build
> the real backend from first principles — do not reference its contract.

**Build status (2026-07-12):** Phase 0 (foundation + DO spike) ✅ · Phase 1 (data layer:
Drizzle `sessions`/`frames`, typed repos, integration tests) ✅ · Phase 2 (Gradient client:
`chat` / `stream` / `structured`, unit + live DO tests) ✅ · Phase 3 (`/v1` endpoints +
services + `shared/contracts`, canned fallbacks) ✅. **Next: Phase 4** (deploy). Team status:
[STATUS.md](./STATUS.md).

```
┌── Browser · React + MediaPipe (raw video/audio never leaves) ───────┐
│  getUserMedia → MediaPipe (~12Hz) → derived signals → 1Hz frames     │
│  deterministic event engine ──candidate──┐   Web Speech → transcript │
└──────────────── HTTPS / SSE ─────────────┼───────────────────────────┘
                                           ▼
┌── DO App Platform · Express (TS) · :8080 ─────────────────────────────┐
│  routes (zod) → services → repositories (Drizzle) → clients (Gradient)│
│  serves client build · holds DO key · CORS locked · canned fallbacks  │
└──────────┬──────────────────────────────────┬────────────────────────┘
           ▼                                   ▼
   DO Gradient AI Inference           DO Managed Postgres (Drizzle)
```

**Layering (each layer knows only the one below):** HTTP routes validate with Zod →
services hold domain logic + deterministic metrics → repositories are the only place SQL
lives (Drizzle) → clients wrap DO Gradient (`chat` / `stream` / `structured`).
`shared/` holds the Zod schemas + inferred types = the wire contract client and server
agree on.

**What exists today (Phases 0–3):** env + Pino + `AppError` + CORS + `/health` + `/ready`;
Drizzle repos for `sessions`/`frames`; Gradient client; `shared/contracts` + services
(metrics / nudge / debrief) + `/v1` routes (sessions, frames, nudge, SSE debrief).
**Not yet (Phase 4):** rate limiting, Dockerfile serving the client build, App Platform deploy.
Progress/history API deferred.

### Gradient client surface (`server/src/clients/gradient.ts`)

| Function | Use |
|---|---|
| `chat({tier, prompt/messages, …})` | one-shot completions (default tier `fast`) |
| `stream(…)` | async-generator text deltas → SSE debrief (default tier `smart`) |
| `structured(zodSchema, {toolName, …})` | forced tool-call + Zod validate + 1 repair retry → typed object |
| `listModels()` | catalog probe |

Models (env): `MODEL_FAST` = `anthropic-claude-haiku-4.5`, `MODEL_SMART` = `anthropic-claude-4.6-sonnet`.

## File structure

### Current (as of Phase 3) — what is on disk

```
wavelength/
├── package.json              # npm workspaces: ["client","server","shared"]
├── AGENTS.md · STATUS.md · README.md · BUILD_PLAN.md · docs/
│
├── client/                   # React app (Vite) — perception stays client-side
│   └── …                     # not yet wired to /v1 API
│
├── shared/src/               # wire contract
│   ├── domain/signals.ts     # SignalFrame, Confidence
│   └── contracts/            # session · frames · nudge · debrief
│
└── server/                   # Node 20 + Express 5 + Drizzle (TypeScript, strict)
    ├── package.json · tsconfig.json · drizzle.config.ts
    └── src/
        ├── index.ts · app.ts · spike.ts · logger.ts · errors.ts
        ├── config/env.ts
        ├── http/
        │   ├── middleware/   # requestId · errorHandler · cors
        │   ├── parse.ts · mappers.ts
        │   └── routes/       # health · sessions · frames · nudge · debrief
        ├── services/         # metrics · nudge · debrief · fallbacks
        ├── repositories/     # sessions · frames
        ├── db/               # schema · client · migrate · migrations/
        └── clients/gradient.ts
```

**HTTP:** `GET /health`, `GET /ready`, plus `/v1/sessions`, `/v1/frames`, `/v1/nudge`,
`/v1/debrief` (SSE). **Commands:**
`npm run spike -w server` · `npm run db:migrate -w server` · `npm test -w server` ·
`npm run test:integration -w server`.

### Target (Phase 4+) — still to build

```
server/src/http/middleware/rateLimit.ts
server/Dockerfile                # App Platform; serve client build
# optional: GET /v1/progress
```

**Priorities / cut order** (see plan): P0 = camera → live engagement chart → nudge →
debrief on a deployed URL. Cut under pressure in this order: pgvector → progress/history
→ frame persistence. Never cut the debrief or the live nudge endpoint.

# AGENTS.md

Instructions for coding agents working in this repo.

## What we're building

**Wavelength** — a consented social co-pilot for one-on-one conversations. It reads
the *trajectory* of a conversation from the webcam and suggests, never diagnoses:
discreet hedged nudges live, an annotated timeline + AI debrief afterward.

This is a **one-day hackathon build**. The full plan (architecture, hour-by-hour
schedule, demo script) is the source of truth: **[BUILD_PLAN.md](./BUILD_PLAN.md)**.

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

- **[BUILD_PLAN.md](./BUILD_PLAN.md)** — the plan. Read this first.
- **[docs/vision.md](./docs/vision.md)** — the public product vision (neurodivergent framing).
- **[docs/north-star.md](./docs/north-star.md)** — the real vision: machine perception of people.
- **[docs/hackathon-goals.md](./docs/hackathon-goals.md)** — judging criteria & target prizes.
- **[docs/backend-plan.md](./docs/backend-plan.md)** — the production backend build plan (phases, stack).
- **[docs/digitalocean.md](./docs/digitalocean.md)** — DigitalOcean capabilities cheat-sheet.
- **`.agents/skills/digitalocean-ai/`** — installed DO Inference skill (deep reference).

## Architecture

Production build, good fundamentals. One monorepo, **one deployable**: a Node/Express
(TypeScript) service that serves the React client *and* owns all DigitalOcean access —
the inference key never reaches the browser. Perception runs **client-side** (MediaPipe);
the LLM and Postgres live behind the server. Full phased plan (stack, gates, spike):
**[docs/backend-plan.md](./docs/backend-plan.md)**.

> The old `debrief/` Python backend was a throwaway test and has been removed. We build
> the real backend from first principles — do not reference its contract.

**Build status (2026-07-12):** Phase 0 (foundation + DO spike) ✅ and Phase 1 (data layer:
Drizzle `sessions`/`frames` migrated to Managed Postgres, typed repos, integration tests) ✅
done. Next: Phase 2 (Gradient client) → Phase 3 (`/v1` endpoints) → Phase 4 (deploy). Team
status: [STATUS.md](./STATUS.md).

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
lives (Drizzle) → clients wrap DO Gradient (chat / SSE stream / forced tool-call).
`shared/` holds the Zod schemas + inferred types = the wire contract client and server
agree on.

## File structure (target)

```
wavelength/
├── package.json              # npm workspaces: ["server","shared"] (client at root for now)
├── AGENTS.md · README.md · BUILD_PLAN.md · docs/
│
├── src/                      # React app (Vite) — stays at root; client-side perception
│   ├── App.tsx               #   3-state machine: CONSENT → LIVE → DEBRIEF
│   ├── perception/           #   ★ MediaPipe → signals → event engine (north-star grows here)
│   ├── api/                  #   typed fetch/SSE calls to the server's /v1 endpoints
│   └── components/ · states/ · lib/
│
├── shared/src/               # the wire contract — Zod schemas + inferred types (no logic)
│   ├── contracts/            #   frames.ts · nudge.ts · debrief.ts · session.ts (req+res schemas)
│   └── domain/               #   SignalFrame, Confidence, shared domain types
│
└── server/                   # Node 20 + Express 5 + Drizzle (TypeScript, strict)
    ├── package.json · tsconfig.json · Dockerfile · drizzle.config.ts
    └── src/
        ├── index.ts          #   bootstrap: config → logger → app → listen :8080
        ├── app.ts            #   express app: middleware, routes, error handler
        ├── config/env.ts     #   Zod-validated env (fail fast)
        ├── logger.ts         #   Pino
        ├── http/
        │   ├── middleware/   #   requestId · errorHandler · cors (locked) · rateLimit
        │   └── routes/       #   health · frames · nudge · debrief · sessions  (/v1)
        ├── services/         #   domain logic: metrics (in code) · nudge · debrief · progress
        ├── repositories/     #   Drizzle queries — the ONLY place SQL lives
        ├── db/
        │   ├── schema.ts · client.ts · migrations/
        ├── clients/gradient.ts   # DO Inference: chat · stream · structured(tool-call+repair)
        └── errors.ts         #   typed error classes + response envelope
```

**Priorities / cut order** (see plan): P0 = camera → live engagement chart → nudge →
debrief on a deployed URL. Cut under pressure in this order: pgvector → progress/history
→ frame persistence. Never cut the debrief or the live nudge endpoint.

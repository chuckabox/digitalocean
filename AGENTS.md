# AGENTS.md

Instructions for coding agents working in this repo.

## What we're building

**Wavelength** — a consented social co-pilot for one-on-one conversations. It reads
the *trajectory* of a conversation from the webcam and suggests, never diagnoses:
discreet hedged nudges live, an annotated timeline + AI debrief afterward.

This is a **one-day hackathon build**. The full plan (architecture, hour-by-hour
schedule, demo script) is the source of truth: **[BUILD_PLAN.md](./BUILD_PLAN.md)**.

## Hard constraints

- **Runs entirely on DigitalOcean.** No other cloud.
- **Must use Gradient AI Inference** — this is required to be eligible for prizes.
- **Never label emotions.** Signal descriptors + hedged suggestions + confidence only.
- **Privacy by architecture:** raw video/audio never leaves the laptop; only derived
  signal features and transcript text reach the backend.

## Where things are

- **[BUILD_PLAN.md](./BUILD_PLAN.md)** — the plan. Read this first.
- **[docs/vision.md](./docs/vision.md)** — the product vision / "why".
- **[docs/hackathon-goals.md](./docs/hackathon-goals.md)** — judging criteria & target prizes.
- **[docs/digitalocean.md](./docs/digitalocean.md)** — DigitalOcean capabilities cheat-sheet.
- **`.agents/skills/digitalocean-ai/`** — installed DO Inference skill (deep reference).

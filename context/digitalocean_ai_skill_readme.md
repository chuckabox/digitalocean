# DigitalOcean Inference — Agent Skill

An [Agent Skill](https://agentskills.io/) that teaches coding agents how to build and deploy apps with the [DigitalOcean Inference Engine](https://docs.digitalocean.com/products/inference/).

Works with Claude Code, Cursor, Codex, and other skills-compatible agents.

## Covers

- **Serverless inference** — 70+ models (text, image, audio, video) on one OpenAI-compatible key
- **Model Playground** — test and compare models in the browser, zero code
- **Image, audio & video generation** — sync (OpenAI) and async (fal, video) workflows
- **Batch inference** — async jobs up to ~50% cheaper
- **Inference Router** (preview) — auto-route each request by cost or latency
- **Evaluations** (preview) — LLM-as-a-Judge scoring against your own datasets
- **Agents & knowledge bases** — persistent agents with RAG
- **Dedicated inference** — dedicated GPU endpoints, Bring Your Own Model
- **Deploy & store** — App Platform (CD from GitHub), Managed Postgres + pgvector, MongoDB, Spaces

## Install

```bash
npx skills add ajot/digitalocean-ai
```

## What's included

| File | Description |
|---|---|
| `SKILL.md` | Serverless inference quick start (cURL, OpenAI SDK), model overview, key endpoints, Model Playground |

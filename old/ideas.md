# Hackathon Ideas — Scored Variants

## Step 1 — Inputs

| Input | Value |
|---|---|
| **Team** | 3+ people, ~12 hours each (~36 person-hours total) |
| **Skills** | Strong frontend (React/Vite/Three.js), comfortable with APIs. **No prior DO experience.** |
| **Sponsor tech (hard req)** | DigitalOcean platform + Gradient AI / DO Inference Engine. Must use to be eligible for top 3. |
| **Theme/tracks** | Social Good, Best UI/UX, Best Use of Data. Judges are DO reps — highlighting DO platform effectively is crucial. |
| **Existing boilerplate** | None. No DO account, no starter repo, no prior Inference Engine usage. |
| **Logistics risks** | ⚠️ Setting up DO account + Inference API key is Step 0 and will eat 30–60 min. Free-tier token limits unknown — check if hackathon provides credits. No one on the team has wired the async fal-ai submit-poll-retrieve flow before — budget extra time for that if any variant needs TTS/audio/image gen. The DO endpoint is OpenAI-compatible, so the OpenAI SDK works — this is a genuine time-saver. |

---

## Step 2 — Core Concept + Scoped Variants

**Core concept: "Misinfo Shield" — a real-time multimodal misinformation triage tool for communities.**

The pain: Misinformation spreads 6x faster than truth online (MIT). Vulnerable communities (elderly, non-English speakers, disaster-affected populations) get hit hardest because fact-checking tools are designed for journalists, not regular people. There's no simple "point and check" tool.

This core concept is strong because:
- It's undeniably social good (information integrity, protecting vulnerable people)
- It *requires* DO Inference centrally (vision analysis, multi-model reasoning, embeddings) — not bolted on
- It plays to the team's frontend strength (the UI *is* the product)
- It's novel: existing fact-checkers are text-only search engines, not multimodal AI triage

Here are 6 scoped variants, from simplest to most ambitious:

### V1 — Base: "Paste & Check" (Text-only triage)
User pastes a suspicious text claim. DO Inference (`llama3.3-70b-instruct`) analyzes it for common misinformation patterns (emotional manipulation, missing sources, logical fallacies). Returns a structured "credibility report" with a visual confidence gauge.
- **DO features used:** Serverless Inference (text reasoning)
- **UI:** Single-page web app. Clean input box → animated "scanning" visualization → credibility report card with a radial confidence gauge.

### V2 — Add: Image Analysis (Multimodal)
Everything in V1, plus user can upload or paste an image (screenshot of a tweet, viral meme, news graphic). DO Inference (Claude Vision or OpenAI Vision) analyzes the image for manipulation signs, text extraction, and context mismatch.
- **DO features added:** Vision model via `/v1/chat/completions` with image input
- **UI addition:** Drag-and-drop image zone. The image renders on screen with animated "scan lines" sweeping over it while AI processes.

### V3 — Add: Multi-Model Consensus (Inference Router)
Everything in V2, but instead of one model's opinion, the claim is sent through the **DO Inference Router** to multiple models (Claude, Llama, Qwen). The app shows a "consensus panel" — did all models agree it's misleading, or did they disagree? Disagreement itself is a signal.
- **DO features added:** Inference Router
- **UI addition:** A "jury panel" visualization — 3 model icons with individual verdicts, then a combined consensus score. Animated deliberation effect.

### V4 — Add: Community Memory (pgvector)
Everything in V3, plus each checked claim is embedded and stored in **DO Managed Postgres + pgvector**. When a new claim arrives, semantic search checks if a similar claim was already debunked. If so, instant result — no inference needed. Over time, the database becomes a living fact-check archive.
- **DO features added:** Managed PostgreSQL + pgvector, embeddings endpoint
- **UI addition:** "Previously debunked" badge with a similarity percentage. A "community stats" sidebar showing total claims checked, top misinformation topics.

### V5 — Add: Audio Accessibility (fal-ai TTS)
Everything in V4, plus the credibility report is read aloud using **fal-ai TTS** for visually impaired or low-literacy users. This is the social good multiplier — making the tool accessible to the people most vulnerable to misinformation.
- **DO features added:** Async fal-ai TTS via `/v1/async-invoke`
- **UI addition:** "Listen to report" button with an audio-reactive waveform visualization while it plays.
- **Risk:** First time wiring async submit-poll-retrieve. Budget 1–2 hours for this integration alone.

### V6 — Add: AI-Generated Visual Explainer
Everything in V5, plus after the triage, the app generates a shareable "explainer card" image (using `openai-gpt-image-2` via DO Inference) that visually breaks down why the claim is false. Designed to be shared on social media to counter the original misinformation.
- **DO features added:** Sync image generation via `/v1/images/generations`
- **UI addition:** A beautifully designed card preview with a "Share" button. The card itself is AI-generated.
- **Risk:** Image gen can take 10–30 seconds. Need loading states. Also adds significant scope.

---

## Step 3 & 4 — Scoring Table

| # | Variant | Pain/Theme | Sponsor Tech | Feasibility | Wow | Scalability | Avg |
|---|---------|-----------|-------------|------------|-----|------------|-----|
| V1 | Paste & Check (text only) | 6 | 5 | 9 | 4 | 5 | **5.8** |
| V2 | + Image Analysis | 7 | 7 | 8 | 6 | 5 | **6.6** |
| V3 | + Multi-Model Consensus | 8 | 9 | 7 | 8 | 6 | **7.6** |
| V4 | + Community Memory (pgvector) | 8 | 10 | 6 | 8 | 8 | **8.0** |
| V5 | + Audio Accessibility (TTS) | 9 | 10 | 5 | 8 | 8 | **8.0** |
| V6 | + AI Explainer Card | 9 | 10 | 4 | 9 | 8 | **8.0** |

### Score Rationale

**V1 scores low on Wow and Sponsor Tech** because text-in-text-out is what every hackathon team does. The DO integration is just a chat completion call — judges will see it as "a wrapper." Not worth building.

**V2 adds Vision**, which is a real step up — multimodal is harder to dismiss. But one model's opinion isn't that compelling. Sponsor tech is better (using vision endpoint), but still just one API call.

**V3 is where it gets interesting.** The Inference Router is a *preview feature* that most teams won't know about. Using it shows deep platform knowledge. The "jury panel" UI is a genuine demo beat — judges can watch 3 models deliberate in real-time. This is your **safe cut**.

**V4 adds pgvector**, which nails "Best Use of Data." The community memory is a real data story — the tool gets smarter with every use. But pgvector setup (Managed DB provisioning, schema, embedding pipeline) will cost 2–3 person-hours minimum, and nobody on the team has done it before. Feasibility drops.

**V5 adds TTS for accessibility.** This is the social good cherry on top, but the async fal-ai flow is new to the team and will cost debugging time. Feasibility drops to 5 because you're now wiring *three* distinct DO integration patterns (sync inference, router, async invoke) plus a database.

**V6 adds image gen.** The generated shareable card is the best demo beat — a judge can hold up their phone and scan a meme live on stage, and the app generates a counter-card in real-time. But it's a lot of scope on top of everything else.

### Nothing clears 9.0, and here's why:

The ceiling is **feasibility, not idea quality.** You have ~36 person-hours with a team that has never used DO before. Setting up the DO account, learning the API, wiring the Inference Router, provisioning pgvector, *and* building a polished UI that wins Best UI/UX is genuinely tight. The idea is strong — the constraint is hours.

### Key tradeoff:

**V3 → V4** is the critical fork. Adding pgvector buys you +1 Scalability and the "Best Use of Data" narrative, but costs ~1 Feasibility point (2–3 hours of DB setup and embedding pipeline). **That's a good trade** if you have a teammate who can own the DB work in parallel while others build the frontend and inference layer.

**V5 → V6** is a bad trade under time pressure. Adding image gen buys +1 Wow but costs -1 Feasibility, and V5 already has a strong demo narrative. The TTS accessibility angle is a better social good story than a generated image card.

---

## Recommendation

**Best realistic pick: V4 (Multi-Model Consensus + Community Memory).** It hits every judging criterion:
- ✅ Social Good (fighting misinformation for vulnerable communities)
- ✅ Best UI/UX (consensus jury panel, animated scan lines, confidence gauges — your frontend team can shine)
- ✅ Best Use of Data (pgvector community memory that gets smarter over time)
- ✅ Sponsor Tech Centrality (Inference Router + Vision + pgvector — the app literally cannot work without DO)
- ✅ Novelty (multi-model consensus is a novel approach — not just "we called GPT")
- ✅ Entertaining Demo (paste a real viral meme on stage, watch 3 AI models deliberate live)

**Stretch goal if time allows: add V5's TTS.** It's a clean bolt-on that adds accessibility cred without restructuring anything.

**Skip V6** unless you're ahead of schedule by hour 8.

---

## Logistics Risks (stated plainly)

1. **DO account setup:** Nobody has one. Budget 30–60 min at the start. Do this *first*, before writing any code.
2. **Inference API key limits:** Unknown whether free tier has token caps that could throttle demo-day usage. Ask organizers if hackathon credits are provided.
3. **pgvector provisioning:** Managed PostgreSQL on DO takes time to spin up. If it's slow, have a fallback plan (local SQLite with a mock vector search for the demo, real pgvector for the "production" story).
4. **Async fal-ai flow (V5 only):** The submit-poll-retrieve pattern is different from standard OpenAI SDK calls. The team hasn't done it before. If you attempt V5, assign one person to own this integration exclusively.

---

## What should we do next?

Which variant do you want to build out into an architecture doc — **V3 (safe cut)**, **V4 (recommended)**, or **V5 (stretch)**? Or do you want to trim further and explore a completely different core concept?

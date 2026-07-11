# Hackathon Ideas Brainstorm (MLH & DigitalOcean)

**Ran skill:** `/hackathon-ideas`

**Inputs Gathered:**
*   **Build window:** ~24 hours
*   **Team size:** 3-4 people
*   **Domain:** Open (focus on max score)
*   **Hard Requirements:** DigitalOcean + Inference Engine (Gradient AI) foundation
*   **Judges:** DO employees
*   **Target Prizes:** Best UI/UX, Best Use of Data, Overall criteria (novelty, technical complexity, social good, entertaining demo).

---

## Core Concept Reasoning

The highest-leverage decision is the core concept. The DO-specific superpower is the cross-provider model catalog ("Anthropic, OpenAI, Meta, and DeepSeek models behind one key, swap by name"). An app whose premise requires that (not just uses it) is maximally central and maximally flattering to DO judges, because it's their own marketing made real.

**The Idea: "Second Opinion"**
A misinformation checker where 4 different frontier models independently assess a health claim, and disagreement between models is surfaced as the signal. A claim goes in, a "model parliament" deliberates live on screen, verdicts and confidence get aggregated, and disagreement renders as visible uncertainty instead of false confidence.
*   **Social good:** Health misinformation.
*   **Entertaining demo:** Judges shout a claim, watch the models argue in real time.

*(Cores considered and rejected: a plain-language document simplifier for accessibility (too common/simple) and a civic open-data storyteller (weaker social-good urgency).)*

---

## Scored Variants (for 3-4 people × 24h budget)

| # | Variant | Pain/Theme | DO Centrality | Feasibility | Wow | Scalability | Avg |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **6** | **Full Combo** — parliament + claim memory + Misinfo Atlas | 8 | 10 | 6 | 10 | 8 | **8.4** |
| **2** | **Base + claim memory** (pgvector: every claim embedded; new claims retrieve similar past verdicts) | 8 | 10 | 8 | 8 | 8 | **8.4** |
| **3** | **Base + Misinfo Atlas** (backfill a public fact-checked-claims dataset, embed + cluster into an explorable map; live claims land in it) | 8 | 10 | 7 | 9 | 8 | **8.4** |
| **1** | **Base** — 4-model parliament, live verdict UI, App Platform deploy | 8 | 9 | 9 | 8 | 7 | **8.2** |
| **5** | **Base + TTS "radio mode"** (verdict read aloud via fal text-to-speech) | 7 | 9 | 8 | 9 | 6 | **7.8** |
| **4** | **Base + DO Evaluations** (their LLM-as-judge preview feature scoring the parliament) | 8 | 10 | 5 | 8 | 7 | **7.6** |

### Recommendations
*   **Pick:** **#6** if your teammates can genuinely parallelize, **#2** as the protective cut.
*   **With 3-4 people, the Full Combo splits cleanly:** one on the parliament pipeline, one on the atlas/dataset, one on UI polish (your Best UI/UX bid lives or dies here), one floating on demo prep. The combo covers both target prizes in one arc — parliament UI for Best UI/UX, atlas + pgvector memory for Best Use of Data.
*   **Fallback:** #2 is what you fall back to at hour 14 if the atlas is dragging.
*   **Skip:** #4 entirely (preview feature, unknown failure modes on event wifi).
*   **Bonus:** #5 is a cheap closing beat you can bolt on at hour 20 only if everything else is done.

---

## Honest Tradeoffs (Why nothing hits 9+)
The ceiling is split between novelty and feasibility, not idea quality. Fact-checking as a category is well-trodden, so Pain/Theme honestly caps at 8. The full arc (orchestration + dataset backfill + clustering viz + prize-grade UI polish) is a legitimately tight 24 hours even for four people, because polish is the first thing that dies under time pressure (which kills Best UI/UX).
To genuinely reach 9+: prep the dataset backfill before the event starts, or have a teammate who's already built a D3/deck.gl cluster visualization before.

---

## Logistics Risks
*   **Do not use DO Batch Inference** for the atlas backfill. It has a 24-hour SLA (your job may return after judging). Backfill with concurrent real-time calls on cheap models instead.
*   **Inference Router and Evaluations** are both public preview — keep them out of the critical demo path.
*   **Cap the atlas backfill** (~2-5k claims on cheap models) and go easy on image generation to conserve the $200 credits.
*   **Candidate datasets:** PUBHEALTH (~12k fact-checked health claims) or the Google Fact Check Tools API.
*   **Security:** Rotate that DO token you pasted earlier before the event — it's in plaintext chat history.

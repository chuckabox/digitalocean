---
name: hackathon-ideas
description: Use when brainstorming or evaluating hackathon project ideas. Generates scoped variants of an idea (base version plus incremental additions) and scores each honestly on 5 criteria (real pain/theme fit, required sponsor-tech centrality, feasibility given actual hours and team size, demo wow/judge legibility, scalability) in a comparison table. Deliberately resists score inflation and will say outright when nothing clears 9/10. Trigger on "brainstorm hackathon ideas", "score this hackathon idea", "evaluate my hack idea", "which hackathon idea should I build", or naming a specific hackathon (MLH, sponsor-tech hackathons, etc.).
---

# Hackathon Idea Critic

Brainstorm hackathon project ideas, then dissect them with numbers instead of vibes. The whole point is to be a harsher, more honest judge than a first brainstorm pass usually gets — most idea lists inflate everything to 9-10/10, which means the scoring isn't actually discriminating between good and bad ideas.

## Step 1 — Gather inputs before scoring anything

Ask (or infer from context) whatever isn't already known:

- **The real pain**: what bottleneck does the user actually have right now? Prefer ideas anchored to something the user personally experiences over generic "wouldn't it be cool if" ideas — real pain produces better demos and better answers to judge Q&A.
- **Team size and hours**: feasibility scoring is meaningless without this. A solo 8-hour build and a 4-person 36-hour build have completely different ceilings.
- **Required sponsor tech / tracks**: hackathons often require a specific API, platform, or SDK to qualify for a prize track. Get the exact name — this becomes the "centrality" criterion.
- **Existing skills/boilerplate**: has the team already solved OAuth, already got a starter repo, already used this API before? This directly changes feasibility — don't score as if everyone starts from zero.
- **Known logistics risks**: free-tier limits, API keys needing a paid deposit, rate limits, whether organizers hand out credits. Flag these once, explicitly, rather than burying them in a score.

## Step 2 — Brainstorm scoped variants, not scattered ideas

Don't produce 6 unrelated ideas. Take the strongest core concept and produce a base version plus 4-6 incremental variants (each adds or swaps one feature: an integration, a UI mode, a data model choice). This mirrors how the idea will actually evolve under time pressure, and it lets the scoring table show real tradeoffs (e.g., "adding a graph view costs you 1 feasibility point for 1 wow point — is that a good trade?").

## Step 3 — Score each variant on these 5 criteria (1-10 each)

1. **Real Pain / Theme Fit** — is this a bottleneck that actually exists, and does solving it require judgment/reasoning (agentic), not just a CRUD form? Does it fit the hackathon's stated theme/tracks?
2. **Sponsor Tech Centrality** — would the app functionally break without the required sponsor API/platform, or is it bolted on to qualify for a prize? Bolted-on integrations should score low (3-5), not get a pass.
3. **Feasibility (actual hours)** — account for real friction, not best-case: OAuth consent screens, LLM prompt-tuning iteration, API integration wiring, UI polish for the demo, debugging under time pressure. Score against the team's *actual* hours and headcount from Step 1, not "feasible with unlimited time."
4. **Demo Wow / Judge Legibility** — can a judge understand what happened in about 2 minutes, ideally watching something happen live on screen rather than being told about it verbally?
5. **Scalability** — technical (does the data model bend to more users without a rewrite?) plus business (is there a real story for who pays for this beyond today's demo?).

## Step 4 — Apply the anti-inflation rule

Before presenting the table, sanity-check it:

- If every variant lands at 9+, the criteria aren't discriminating — go back and re-score harder, especially Feasibility. A 4-agent pipeline with vector embeddings and a live multi-agent debate UI is not a realistic 8-hour solo build regardless of how good the idea is; score the hours, not the ambition.
- If nothing clears a true 9.0 average, **say so explicitly** and explain *why* — usually because feasibility is the real ceiling, not idea quality. Naming the ceiling (not just the number) is what makes the score useful. Example framing: "the ceiling here is feasibility, not the idea — a real OAuth flow plus a working extraction pipeline plus a second feature is a legitimately tight scope even for two people."
- Show at least one concrete 1-for-1 tradeoff between variants (e.g., "adding X buys a nicer demo beat but costs a feasibility point — that's a real tradeoff, not a rounding error").
- If the user wants a 9+, say what would actually have to change (more time, a pre-built starter repo for the tricky integration, a teammate who's already solved this exact problem) rather than just inflating the number.

## Step 5 — Output format

Present a single markdown table: `# | Variant | Pain/Theme | Sponsor Tech | Feasibility | Wow | Scalability | Avg`, sorted so the strongest variants are easy to spot. Follow with:

- 2-3 sentences on which variant(s) are the best realistic picks and why (safest cut vs. fuller/riskier cut).
- The "why nothing hits 9+" paragraph if applicable (Step 4).
- Any logistics risks flagged in Step 1 (free-tier limits, deposit requirements, credits), stated once, plainly, without softening them into the score.
- A direct question back to the user: which variant to build out further (e.g., into an architecture doc), or whether to trim scope further in favor of feasibility over wow.

## Tone

Be the honest second opinion, not a cheerleader. Lead with the real ceiling before the praise. If the framing of the idea itself is the problem (wrong pain, tech bolted on, infeasible for the team's actual hours), say that plainly instead of scoring around it.

# Integration note — for Dinil's Claude reading this branch

> You wrote `BUILD_PLAN.md` (on `dinil-main`) for a 3-state app: CONSENT → LIVE → DEBRIEF.
> **Good news: your entire State 3 (DEBRIEF) is already built, deployed, and verified on real
> DigitalOcean inference on this branch (`connor-main`).** Several of your "first 30 minutes"
> P0/P1 tasks are also already done. Read this before rebuilding anything.

## First: the name is Wavelength
Connor and the team locked **Wavelength** (see `ALIGNMENT.md`). Not Attune/Tandem/Undertone.
The deployed app, API, and all docs already use it. "Being on someone's wavelength" fits the
two-way-translator framing perfectly. Please don't re-open the name.

## What is ALREADY DONE (do not rebuild — it maps onto your plan)

| Your BUILD_PLAN item | Status on `connor-main` |
|---|---|
| P0 "deploy skeleton to App Platform by hour 1, demo on live URL" | **DONE.** Live: https://wavelength-brain-37j5z.ondigitalocean.app (Docker, port 8080). |
| P1 "provision Managed Postgres at hour 0" | **DONE** (provisioning; `debrief/schema.sql` is the schema; `debrief/memory.py` auto-uses it via `DATABASE_URL`). |
| "Verify exact model names against GET /v1/models in first 30 min — don't trust memory" | **DONE.** Real names: `anthropic-claude-haiku-4.5` (default, ~20s), `anthropic-claude-4.6-sonnet` (~30s, sharper). Also live: claude-opus-4.x, deepseek, qwen. **`llama3.3-70b-instruct` is NOT in the catalog** — it 404s. |
| "Structured-output warning: response_format/json_schema not documented; use tool-calling + repair" | **Confirmed and already solved.** I hit exactly this. What works without tool-calling: plain prompt asking for JSON + strip ```json fences + normalize enum values (`_extract_json` / `normalize_debrief` in `debrief/run_debrief.py`). Tool-calling is optional, not required. |
| State 3 DEBRIEF: annotated timeline + streaming AI debrief, hedged, confidence-tagged | **DONE.** `POST /api/debrief` returns the full schema (`debrief/SPEC.md`): summary, per-moment observation/interpretation/confidence/source(audio\|video\|both)/try_instead, patterns, what_worked, next_time. Warm-but-direct voice, tuned on real inference. |
| "not one prompt" evidence (deterministic layer) | **DONE (audio side).** `debrief/metrics.py`: talk-ratio, question counts, longest monologue — computed in code, passed INTO the prompt as facts. Your MediaPipe signal layer is the video side of the same idea. |
| Best Use of Data / past sessions | **DONE.** `debrief/memory.py` tracks recurring patterns + progress trends across sessions; `sample-memory.json` is a seeded improving trajectory for the sidebar. |
| Fallbacks (cached debrief, canned) | **DONE.** `WAVELENGTH_MOCK=1` serves a gold debrief with live-computed metrics; `debrief/viewer.html` has offline-fixture fallback. |

## How our two halves compose (this is the whole integration)
Your LIVE state produces a 1 Hz engagement stream from MediaPipe. Feed its notable shifts into
our debrief as the **`visual_signals`** array the prompt already accepts:
`[{ "t": "00:30", "observation": "partner leaned back, gaze away" }, ...]`.
The debrief already fuses those with the transcript and tags moments `source: "both"`. So your
live signal layer and our debrief are the same pipeline end to end — no glue needed beyond
passing that array.

## State 2 (LIVE) nudge endpoint is ALSO built for you
Your event engine stays client-side (MediaPipe -> z-score + cooldown decides WHEN to fire and
gathers evidence). It just calls this to PHRASE the nudge (~1.3s warm, hedged, no emotion words):
```
POST https://wavelength-brain-37j5z.ondigitalocean.app/api/nudge
body: { "confidence": "medium",
        "evidence": ["gaze away 9s", "smile fading", "you've held the floor 84s"],
        "context": "catching up with a friend" }   // context optional
-> { "text": "Maybe ask them about something they're interested in?",
     "confidence": "medium", "evidence": [...] }
```
So you write NO backend at all - both `/api/nudge` (LIVE) and `/api/debrief` (DEBRIEF) are served
from the one deployed DO app, with the inference key already configured. Decision confirmed:
**your React frontend calls this Python API; do not build an Express proxy.**

## The API your React frontend calls for State 3 (CORS is open)
```
POST https://wavelength-brain-37j5z.ondigitalocean.app/api/debrief?model=anthropic-claude-haiku-4.5&history=1
body: { conversation_id, user_speaker, turns:[{speaker,t,text}], visual_signals:[{t,observation}] }
-> full debrief JSON (schema in debrief/SPEC.md)
```
`debrief/viewer.html` is a working reference renderer for exactly this response.

## The LIVE -> DEBRIEF bridge is written for you
`debrief/frames_to_signals.js` (pure fn, importable in React/TS): pass your ~1 Hz MediaPipe
engagement frames, get back the `visual_signals` array the debrief consumes. Call it at End
Session and hand the result to `/api/debrief`. Verified against a synthetic drift-and-recover
stream. This is the only glue between your LIVE half and our DEBRIEF half.

## Demo + Q&A source of truth
Your `BUILD_PLAN.md` §6 (skit + staging trick) is the canonical demo script - it's good, keep it.
Our `pitch-script.md` Q&A prep and `demo-runsheet.md` fallback ladder supplement it (emotion-
validity, consent, why-not-real-time, cost-per-debrief answers). Don't write a third version.

## The two decisions (RESOLVED by Connor)
- **Real-time LIVE nudges: YES** - converge on the 3-state plan. Build the live loop.
- **Stack: React calls the deployed Python API** (`/api/nudge` + `/api/debrief`) - no Express proxy.
- **Name: Wavelength.** **Window: ~8 hours left** - protect the clock; our deployed backend is
  the reliable core and the fallback if the live loop slips.

## Original open decisions (now settled, kept for context)
1. **Real-time LIVE nudges (your States 1-2).** Connor previously cut real-time for attention-split
   reasons; your staging trick (partner can't see the screen) is a strong answer to that, so it's
   reasonable to re-add. **Waiting on Connor to confirm before anyone builds the live loop.**
2. **Stack.** Our debrief backend is Python/Flask and already deployed. Two clean options:
   (a) your React frontend just calls the live Python API above for State 3 — zero rebuild,
   cross-stack is fine over HTTP; (b) port the ~200 lines of debrief logic into your Node service.
   Recommend (a) to protect the clock. Either way, the prompt/schema/metrics are done — reuse them.

## For Peter (React frontend on `peter-main-2`)
Your UI shell is good — Live / Timeline / Stats map cleanly onto LIVE / DEBRIEF / progress. One
gap: **the app renders static `src/data/sessions.ts` and does not call the backend yet.** The
backend is live and real; wiring it is small. A typed, dependency-free client is ready for you:
**`debrief/wavelength-client.ts`** — copy to `src/lib/`. Mapping:

| Your view | Call | Returns |
|---|---|---|
| LiveView (during convo) | `postFrames(convId, frames)` every ~5s, `getNudge({confidence, evidence})` when your engine fires | nudge text ~1.5s |
| End Session → Timeline | `framesToVisualSignals(frames)` then `getDebrief(transcript, {history:true})` | full `Debrief` (summary, moments[], patterns[], what_worked, next_time) |
| StatsView | `getProgress()` | cross-session metric trends |

Your `SessionEvent[]` shape is close to our `Moment[]` — map `moment.source` → your `channel`,
`moment.confidence` → your kind/severity, `moment.observation`+`try_instead` → your event body.
Keep `sessions.ts` as the offline fallback (rung 3). `debrief/viewer.html` renders the real
`Debrief` shape if you want a reference for fields + styling.

## Timeline note
Your plan assumes an 8-hour, hour-6.5-freeze event. Confirm the actual window with Connor — earlier
context suggested longer. It changes how much of the LIVE half is safe to attempt.

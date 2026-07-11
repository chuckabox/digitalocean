# Wavelength — Conversation Debrief and Co-Pilot for Neurodivergent Networking

> Living context doc for our final idea. Everything the team needs for the build and the
> 2-minute judge pitch goes here. Status: **name locked (Wavelength), mode locked
> (CONSENT → LIVE → DEBRIEF), modality locked (audio core + video supporting layer).
> Backend is Express/TypeScript on DO App Platform; frontend is React (`client/`).**

## One-liner
A consented social co-pilot for neurodivergent people who want to practice and get better at casual conversation. It reads the *trajectory* of a conversation from the webcam and suggests, never diagnoses: discreet hedged nudges live in the moment, plus an annotated timeline and AI debrief afterward.

## Origin story (this is our "why us", lead the pitch with it)
On our UQIES trip, someone we were travelling with really struggled to connect with people. One
moment stuck with us: a few lines into a conversation with a stranger, they disclosed that they're
autistic. It was true and honest, but the timing landed wrong and the room went dead silent. They
didn't get why, and no one told them.

That is the exact gap this tool fills. Not "you're broken," but "here is what happened in that
moment, here is *why* it landed the way it did, and here is what you could try next time." We have
autistic friends and we watched this happen in person. That is the story judges remember, and it
is real.

## The problem (Social Good)
Networking and casual conversation run on unwritten rules: how much to disclose and when, how to
read when someone's interest shifts, how to balance talking and asking. Many neurodivergent people
find these rules invisible in the moment. Existing help is expensive human coaching or generic
apps that don't work on real, messy conversations. Nobody gives you honest, specific feedback on a
conversation you actually had.

Why this scores where others don't: **the social good is showable and personal**, and it
survives Q&A because the value is obvious.

## Product mode: 3-State App (CONSENT → LIVE → DEBRIEF) (LOCKED)
We are running a single-page web app with three critical states:
1. **CONSENT**: A visible, partner-facing consent screen ensures ethics-first design. Raw video never leaves the laptop.
2. **LIVE**: As the conversation happens, the screen faces the user (hidden from the partner). We show an engagement sparkline and deliver rare, discreet, highly hedged nudges if the partner disengages.
3. **DEBRIEF**: Post-conversation timeline with flagged moments and a full AI breakdown (what worked, what to try differently).

## Target user + framing guardrails
Primary user: a neurodivergent adult who wants to get better at networking and casual conversation
on their own terms. Not a clinical or diagnostic tool.

Guardrails (self-advocacy community and social-good judges care about these):
- **Agency, not correction.** Offers interpretations and options, never "you did this wrong."
- **Explicit and concrete, not vague.** Many neurodivergent users prefer direct, literal feedback
  over softened social hints.
- **Never diagnoses emotions.** We measure *observable behaviors* (talk time, smile, lean, gaze) and present *hedged suggestions* with confidence scores, never emotion labels.
- **"Nothing about us without us."** Built with community input.

## How it works (Architecture)
1. **Client-Side Perception**: Browser uses `getUserMedia` + MediaPipe to extract facial landmarks (blendshapes) at 12Hz. Web Speech API captures transcript.
2. **Derived Signals**: Pure JS calculates signals (smile, nod, gaze, engagement) mapped against a per-person baseline.
3. **DO Backend (Express/TS)**: The React app sends 1Hz signal frames to the DO-hosted Express API.
4. **Live Nudges**: A deterministic event engine watches for engagement drops, then hits DO Inference for a hedged nudge.
5. **Debrief**: Post-conversation, DO Inference (Claude Haiku/Sonnet) generates a structured timeline and coaching debrief.
6. **Longitudinal Memory (Best Use of Data)**: DO Managed Postgres stores all frames and debriefs to track user progress across multiple sessions.

## DigitalOcean tech mapping (Know the Audience)
Every layer rides on their platform:
- **DO Inference — reasoning model:** The nudge generation and the debrief analysis.
- **DO Managed Postgres:** Longitudinal pattern memory / Best Use of Data.
- **DO App Platform:** Express/TypeScript backend deployment and React serving.
- **Multi-model flex (demo beat):** Live-swap the reasoning model (e.g. Haiku to Sonnet) and show the debrief get sharper. One line of code on their platform.

## Defensibility (read before pitching)
You cannot reliably read a specific emotion off a face; the "one expression = one emotion" idea is
contested. So we never output verdicts about internal emotion. We surface **observable signals + a
probabilistic interpretation + the reasoning + explicit uncertainty.** Anchoring the core in
conversation *content and timing* (which is concrete and defensible) rather than facial
emotion-reading is deliberate.

## How it demos (Entertaining Demo)
Reenact the origin story with a live skit:
1. **Consent**: Tap "I consent" visibly.
2. **Live Loop**: The user talks too long about a dry topic. The partner disengages on cue. The engagement line drops live, and a nudge fires ("They may be drifting — maybe ask a question?"). User acts on it, line recovers.
3. **Debrief**: End the session and watch the annotated timeline replay with Claude's debrief.

## Scoring against the 5 judged criteria
| Criterion | Read |
|---|---|
| Novelty (DO use) | Strong — live nudges, multimodal debrief across DO models + Postgres memory. |
| Technical Complexity | Strong — Client-side perception (MediaPipe) + deterministic engine + DO inference. Not one prompt. |
| Social Good | Strong AND demoable, anchored in a real person we know. |
| Entertaining Demo | Strong — reenacted origin story + live engagement chart + judge participation. |
| Know the Audience | Strong — every layer is DO, with a multi-model flex. |

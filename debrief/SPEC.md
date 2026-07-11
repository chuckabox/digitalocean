# Debrief Brain — Output Schema + Prompt Design

> **LIVE on DO App Platform (mock mode): https://wavelength-brain-37j5z.ondigitalocean.app**
> `GET /health` · `POST /api/debrief` · `GET /api/progress`. Peter: point the UI straight at
> this, no local server needed. Deploys from `connor-main` `debrief/` (git source = manual
> redeploy via DO console/API after pushes, not automatic). When the model access key exists,
> set `DIGITAL_OCEAN_MODEL_ACCESS_KEY` and remove `WAVELENGTH_MOCK` in the app's env vars for
> real inference.

> The "brain" of the product: takes a speaker-labelled conversation transcript and produces the
> structured debrief the UI renders. This is the layer Dinil's pipeline calls and Peter's UI
> displays. Built on `connor-main` in parallel with architecture + website.

## Division of labor (so we don't collide)
- **Dinil (architecture/pipeline):** capture → transcribe → diarize → call this prompt on DO
  Inference → store to Postgres/pgvector. He owns *how* the transcript gets here and where the
  output goes.
- **Peter (website/UI):** renders the JSON below. The schema is the contract between us.
- **Us (this folder):** the prompt, the output schema, and test fixtures to prove quality.

## Decisions locked (team-agreed)
Name: **Wavelength**. Mode: post-conversation debrief (live nudges = roadmap, not build).
Modality: **audio is the core signal, video is in scope** as a supporting layer that corroborates
the transcript. Workflow: separate branches (`connor-main`, `dinil-main`, Peter on his), merge
before demo.

## Input contract
A JSON transcript: ordered turns, each with speaker label, start time, and text. Optionally a
`visual_signals` array (produced by `extract_visuals.py` from sampled video frames): observable
partner behaviour only, never emotion labels.

```json
{
  "conversation_id": "abc123",
  "user_speaker": "S1",
  "turns": [
    { "speaker": "S1", "t": "00:04", "text": "Hi, I'm ..." },
    { "speaker": "S2", "t": "00:07", "text": "Hey ..." }
  ],
  "visual_signals": [
    { "t": "00:30", "observation": "partner's smile fading, glancing out toward the room" }
  ],
  "user_history_summary": "optional: recurring patterns for this user from pgvector memory"
}
```

## Output contract (what the UI renders)
The reasoning model must return exactly this shape. Never an emotion verdict; always signal +
interpretation + uncertainty + a concrete alternative.

```json
{
  "summary": "2-3 sentence plain, honest read of how the conversation went overall.",
  "metrics": {
    "user_talk_ratio": 0.72,
    "questions_asked_by_user": 1,
    "questions_asked_by_other": 6,
    "longest_user_monologue_seconds": 48
  },
  "moments": [
    {
      "t": "01:30",
      "quote": "the exact line that triggered the moment",
      "observation": "what concretely happened (behavioural, not mind-reading)",
      "interpretation": "what it likely signalled, hedged: 'often means...', 'may have...'",
      "confidence": "low | medium | high",
      "why_it_matters": "the social rule being surfaced, stated explicitly",
      "try_instead": "a concrete alternative line or move for next time",
      "source": "audio | video | both (optional, default audio) — lets the UI badge which channel caught the moment"
    }
  ],
  "patterns": [
    {
      "label": "disclosure timing | talk-time balance | reciprocal questions | topic transitions | self-vs-other focus",
      "finding": "explicit, concrete description of the recurring habit",
      "coaching": "the rule + what to practice, stated directly not vaguely",
      "recurring": true
    }
  ],
  "what_worked": ["specific things the user did well — always include at least one, genuinely"],
  "next_time": ["2-4 concrete, practiceable takeaways ranked by impact"]
}
```

### Schema rules that matter
- `moments[].interpretation` is **always hedged** ("often", "can", "may"), never "she was bored".
- `confidence` is honest and visible in the UI (this is our defensibility on stage).
- `what_worked` is never empty. Agency-first framing depends on it.
- Everything is **explicit and concrete**. No "consider being mindful of tone." Say the rule.

## The prompt (draft, for DO reasoning model)
System prompt for `anthropic-claude-*` / `llama3.3-70b-instruct` on DO Inference:

```
You are a direct, concrete conversation coach for a neurodivergent adult who wants to get
better at networking. You are debriefing a conversation they already had.

Rules:
- Be explicit and literal. State the unwritten social rule plainly. Do not soften with vague
  hints like "maybe consider" — say exactly what happened and exactly what to try instead.
- Never claim to know someone's internal emotion. Describe observable behaviour, then give a
  hedged interpretation ("shorter replies often signal...") with a confidence level.
- Respect the user's agency. Offer options, never say they are broken or did something "wrong".
- Always name at least one genuine thing they did well.
- Focus on concrete, coachable patterns: disclosure timing, talk-time balance, whether they
  asked reciprocal questions, topic transitions, and self-focus vs interest in the other person.
- Return ONLY valid JSON matching the provided schema. No prose outside the JSON.

If given the user's history summary, note when a pattern is recurring (set "recurring": true)
and reference it gently ("this has come up before").
```

User message = the input JSON transcript (+ optional history summary). Response = the output JSON.

## Why this is "not one prompt" (technical-complexity criterion)
The prompt is one visible piece, but the system around it is not: diarization to attribute turns,
metric computation (talk ratio, question counts, monologue length) that grounds the model instead
of letting it guess, temporal structure over the whole conversation, and the pgvector memory that
makes patterns *recurring* across sessions. The metrics also act as guardrails so the model's
coaching is anchored to real numbers, not vibes.

## Memory layer (Best Use of Data)
`memory.py` stores every debrief and produces two things: a `user_history_summary` string that
feeds the prompt (recurring patterns + metric trends, so the coach can say "this has come up
before" and acknowledge real improvement), and a `progress` dict for the UI's progress panel
(per-metric values + improving/steady/watch verdicts). `sample-memory.json` is a 3-session
fixture with an improving trajectory — Peter can build the progress panel against it now.
Local JSON for the demo; `schema.sql` is the DO Managed Postgres + pgvector production shape
(same data, plus embedded moments for "you've had this moment before" semantic recall).
Run with history: `python run_debrief.py --history`.

## Open items for the brain layer
- Should metrics be computed in code (deterministic, recommended) and passed *into* the prompt, or
  left to the model? Recommend code-computed for reliability and to strengthen the tech story.
- Confirm the reasoning model choice on DO (Claude for quality vs Llama for cost/speed); the
  multi-model swap is a nice demo beat either way.

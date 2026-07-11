"""Wavelength - live nudge phrasing (State 2 / LIVE).

The client-side event engine (MediaPipe -> derived signals -> z-score +
cooldown) decides WHEN to nudge and gathers the evidence. This module only
PHRASES the nudge: evidence + a confidence tier in, one hedged, kind suggestion
out. Deliberately tiny so it returns in a couple of seconds, fast enough to
feel live.

Hard rules (same ethics as the debrief):
- A suggestion to the USER ("maybe ask a question"), never a claim about the
  partner ("they're bored").
- No emotion nouns, no diagnoses. Observable-signal language only.
- Always hedged, always carries the confidence tier it was given.

    from nudge import generate_nudge
    generate_nudge({"confidence": "medium",
                    "evidence": ["gaze away 9s", "smile fading", "you've held the floor 84s"],
                    "context": "catching up with a friend"})
    -> {"text": "...", "confidence": "medium", "evidence": [...]}
"""

from __future__ import annotations

import json
import os

from run_debrief import BASE_URL, CONFIDENCE_VALUES, _extract_json

# Small + fast: nudges must feel live. Haiku on a one-sentence output returns
# in ~2-4s. Swap here if a faster model is preferred.
DEFAULT_NUDGE_MODEL = "anthropic-claude-haiku-4.5"

NUDGE_SYSTEM_PROMPT = """\
You phrase a single discreet, in-the-moment nudge for a neurodivergent person during a
conversation. You are given evidence (observable signals) and a confidence tier. Turn it into
ONE short, kind, actionable suggestion TO THE USER.

Hard rules:
- A suggestion to the user ("maybe ask them a question", "might be a good moment to pause"),
  never a statement about the other person's feelings.
- Never use emotion words (bored, angry, upset, uncomfortable) or any diagnosis. Describe only
  what to DO, grounded in the observable evidence.
- Always hedged ("might", "maybe", "could"). Never certain.
- One sentence, warm, under ~15 words. No preamble.

Return ONLY JSON: {"text": "<the nudge>", "confidence": "<low|medium|high, echo what you were given>"}
"""


def _fallback_nudge(payload: dict) -> dict:
    """Canned nudge if the model call fails - keeps the LIVE demo alive offline."""
    return {
        "text": "They might be drifting - maybe ask them a question?",
        "confidence": payload.get("confidence", "low"),
        "evidence": payload.get("evidence", []),
    }


def generate_nudge(payload: dict, model: str = DEFAULT_NUDGE_MODEL) -> dict:
    api_key = os.getenv("DIGITAL_OCEAN_MODEL_ACCESS_KEY")
    if not api_key:
        raise RuntimeError("DIGITAL_OCEAN_MODEL_ACCESS_KEY is not set")
    from openai import OpenAI

    conf = str(payload.get("confidence", "low")).lower()
    if conf not in CONFIDENCE_VALUES:
        conf = "low"
    evidence = payload.get("evidence", [])
    user_msg = {
        "confidence": conf,
        "evidence": evidence,
        "context": payload.get("context", ""),
    }

    client = OpenAI(base_url=BASE_URL, api_key=api_key)
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": NUDGE_SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(user_msg)},
        ],
        max_completion_tokens=120,
    )
    out = _extract_json(resp.choices[0].message.content)
    text = str(out.get("text", "")).strip()
    if not text:
        return _fallback_nudge(payload)
    # confidence + evidence come from the client's event engine; the model only phrases.
    return {"text": text, "confidence": conf, "evidence": evidence}

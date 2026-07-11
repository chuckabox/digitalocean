"""Wavelength - reference debrief runner (the "brain" end to end).

Pipeline: transcript -> deterministic metrics -> grounded prompt -> DO Inference
reasoning model -> validated debrief JSON. This is the reference implementation
Dinil's pipeline can call or copy; the prompt and schema match debrief/SPEC.md.

Run a dry run (no API key needed) - prints metrics, shows the assembled prompt,
and validates the bundled gold debrief against the schema:
    python run_debrief.py --dry-run

Run for real against DigitalOcean Inference (needs a model access key):
    export DIGITAL_OCEAN_MODEL_ACCESS_KEY=...   # created in the DO console
    python run_debrief.py --model llama3.3-70b-instruct

Note: DIGITAL_OCEAN_MODEL_ACCESS_KEY is the Inference "model access key", which
is NOT the same as a DigitalOcean infrastructure API token.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from metrics import compute_metrics

BASE_URL = "https://inference.do-ai.run/v1/"
DEFAULT_MODEL = "anthropic-claude-haiku-4.5"  # confirmed in DO catalog; swap models for the flex

SYSTEM_PROMPT = """\
You are a warm, encouraging conversation coach for a neurodivergent adult who wants to get
better at networking. You are debriefing a conversation they already had. You are on their
side: think "a good friend who genuinely wants them to win", never a clinical evaluator.

Voice (matters as much as content):
- Kind and human, never cold or report-like. "That long stretch about your projects is easy to
  do when you're excited" lands better than "You delivered a 32-second monologue."
- Frame misses as learnable skills, not failures. It is always "here's a move to practice",
  never "here's what you did wrong."
- Acknowledge intent and effort where real ("you were being honest", "you clearly care about
  the details"). Warmth must be genuine, not filler praise.
- Never shame, never pity, never talk down.

Rules:
- Warm does NOT mean vague. Be explicit and literal - neurodivergent users prefer direct,
  concrete feedback over softened hints. State the unwritten social rule plainly and say
  exactly what happened and exactly what to try instead. Kind voice, concrete content.
- Never claim to know someone's internal emotion. Describe observable behaviour, then give a
  hedged interpretation ("shorter replies often signal...") with a confidence level.
- Respect the user's agency. Offer options, never say they are broken or did something "wrong".
- Never tell the user to hide or omit who they are. Personal disclosures (like being autistic)
  are always valid; coach the timing and framing, never advise them to stay silent about it.
  Do not suggest "skipping" the disclosure, even softened - whether to disclose is the user's
  choice alone. Only ever coach WHEN and HOW.
- Always name at least one genuine thing they did well.
- Focus on concrete, coachable patterns: disclosure timing, talk-time balance, whether they
  asked reciprocal questions, topic transitions, and self-focus vs interest in the other person.
- The metrics provided are computed facts. Ground your coaching in them; do not contradict them.
- Be CONCISE. At most 3 moments (the most coachable ones). Keep every string field to one or
  two short sentences. The user wants sharp takeaways, not an essay.
- If visual_signals are provided, treat them as observable behaviour of the conversation partner
  (posture, gaze, expression movement), never as emotion labels. Fuse them with the transcript.
  When a visual shift corroborates something in the words, say so and set that moment's
  "source" to "both". Use "video" if the signal is only visual, "audio" if only verbal.
- Return ONLY valid JSON matching the schema below. No prose outside the JSON.

If given the user's history summary, note when a pattern is recurring (set "recurring": true)
and reference it gently ("this has come up before").

Schema:
{
  "summary": str,
  "metrics": { echo the metrics you were given },
  "moments": [ { "t": str, "quote": str, "observation": str, "interpretation": str,
                 "confidence": "low|medium|high", "why_it_matters": str, "try_instead": str,
                 "source": "audio|video|both" (optional, default audio) } ],
  "patterns": [ { "label": str, "finding": str, "coaching": str, "recurring": bool } ],
  "what_worked": [ str, ... ],   // at least one, genuine
  "next_time": [ str, ... ]      // 2-4 concrete takeaways
}
"""

CONFIDENCE_VALUES = {"low", "medium", "high"}
SOURCE_VALUES = {"audio", "video", "both"}


def build_messages(transcript: dict, metrics: dict, history_summary: str | None = None) -> list[dict]:
    payload = {
        "computed_metrics": metrics,
        "user_speaker": transcript.get("user_speaker"),
        "turns": transcript["turns"],
    }
    if transcript.get("visual_signals"):
        payload["visual_signals"] = transcript["visual_signals"]
    if history_summary:
        payload["user_history_summary"] = history_summary
    user_content = (
        "Debrief this conversation. The computed_metrics are facts to ground your coaching in.\n\n"
        + json.dumps(payload, indent=2)
    )
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]


def normalize_debrief(obj: object) -> object:
    """Coerce harmless model-output variants (case, hyphenated grades) into schema values."""
    if not isinstance(obj, dict):
        return obj
    for m in obj.get("moments") or []:
        if not isinstance(m, dict):
            continue
        conf = str(m.get("confidence", "")).strip().lower()
        if conf not in CONFIDENCE_VALUES:
            # e.g. "Medium", "medium-high", "moderate", "very low"
            if "high" in conf:
                conf = "high"
            elif "low" in conf:
                conf = "low"
            elif "med" in conf or "moder" in conf:
                conf = "medium"
        m["confidence"] = conf
        if "source" in m:
            src = str(m["source"]).strip().lower()
            m["source"] = src if src in SOURCE_VALUES else "both" if "vid" in src and "aud" in src else src
    return obj


def validate_debrief(obj: object) -> list[str]:
    """Return a list of schema problems. Empty list means valid."""
    errors: list[str] = []

    def require(cond: bool, msg: str) -> None:
        if not cond:
            errors.append(msg)

    if not isinstance(obj, dict):
        return ["top level is not an object"]

    require(isinstance(obj.get("summary"), str) and obj["summary"].strip() != "", "summary must be a non-empty string")

    metrics = obj.get("metrics")
    require(isinstance(metrics, dict), "metrics must be an object")
    if isinstance(metrics, dict):
        for key in ("user_talk_ratio", "questions_asked_by_user", "questions_asked_by_other", "longest_user_monologue_seconds"):
            require(isinstance(metrics.get(key), (int, float)), f"metrics.{key} must be a number")

    moments = obj.get("moments")
    require(isinstance(moments, list), "moments must be a list")
    for i, m in enumerate(moments or []):
        if not isinstance(m, dict):
            errors.append(f"moments[{i}] must be an object")
            continue
        for key in ("t", "quote", "observation", "interpretation", "why_it_matters", "try_instead"):
            require(isinstance(m.get(key), str) and m[key].strip() != "", f"moments[{i}].{key} must be a non-empty string")
        require(m.get("confidence") in CONFIDENCE_VALUES, f"moments[{i}].confidence must be one of {sorted(CONFIDENCE_VALUES)}")
        if "source" in m:
            require(m.get("source") in SOURCE_VALUES, f"moments[{i}].source must be one of {sorted(SOURCE_VALUES)}")

    patterns = obj.get("patterns")
    require(isinstance(patterns, list), "patterns must be a list")
    for i, p in enumerate(patterns or []):
        if not isinstance(p, dict):
            errors.append(f"patterns[{i}] must be an object")
            continue
        for key in ("label", "finding", "coaching"):
            require(isinstance(p.get(key), str) and p[key].strip() != "", f"patterns[{i}].{key} must be a non-empty string")
        require(isinstance(p.get("recurring"), bool), f"patterns[{i}].recurring must be a boolean")

    ww = obj.get("what_worked")
    require(isinstance(ww, list) and len(ww) >= 1 and all(isinstance(x, str) for x in ww), "what_worked must be a non-empty list of strings")

    nt = obj.get("next_time")
    require(isinstance(nt, list) and len(nt) >= 1 and all(isinstance(x, str) for x in nt), "next_time must be a non-empty list of strings")

    return errors


def _extract_json(text: str) -> object:
    # Models often wrap JSON in a ```json ... ``` fence; strip it first.
    fenced = text.strip()
    if fenced.startswith("```"):
        fenced = fenced.split("```", 2)[1]
        if fenced.lstrip().lower().startswith("json"):
            fenced = fenced.lstrip()[4:]
    start, end = fenced.find("{"), fenced.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("no JSON object found in model output")
    return json.loads(fenced[start : end + 1])


def generate_debrief(transcript: dict, model: str, history_summary: str | None = None) -> dict:
    api_key = os.getenv("DIGITAL_OCEAN_MODEL_ACCESS_KEY")
    if not api_key:
        raise RuntimeError("DIGITAL_OCEAN_MODEL_ACCESS_KEY is not set (create a model access key in the DO console)")
    try:
        from openai import OpenAI  # lazy: dry-run needs no dependency
    except ImportError as exc:
        raise RuntimeError("openai package not installed: pip install openai") from exc

    metrics = compute_metrics(transcript)
    client = OpenAI(base_url=BASE_URL, api_key=api_key)
    resp = client.chat.completions.create(
        model=model,
        messages=build_messages(transcript, metrics, history_summary),
        max_completion_tokens=4000,
    )
    debrief = normalize_debrief(_extract_json(resp.choices[0].message.content))
    problems = validate_debrief(debrief)
    if problems:
        raise ValueError("model output failed schema validation:\n  " + "\n  ".join(problems))
    return debrief


def _dry_run(transcript_path: Path) -> int:
    transcript = json.loads(transcript_path.read_text(encoding="utf-8"))
    metrics = compute_metrics(transcript)
    messages = build_messages(transcript, metrics)

    print("=== computed metrics ===")
    print(json.dumps(metrics, indent=2))
    print("\n=== system prompt (first 400 chars) ===")
    print(messages[0]["content"][:400] + "...")
    print("\n=== user message (first 500 chars) ===")
    print(messages[1]["content"][:500] + "...")

    gold_path = transcript_path.with_name("sample-debrief.json")
    if gold_path.exists():
        gold = json.loads(gold_path.read_text(encoding="utf-8"))
        problems = validate_debrief(gold)
        print("\n=== schema check on gold debrief ===")
        print("PASS - gold debrief conforms to schema" if not problems else "FAIL:\n  " + "\n  ".join(problems))
        return 0 if not problems else 1
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Wavelength debrief runner")
    parser.add_argument("transcript", nargs="?", help="path to transcript JSON (default: sample-transcript.json)")
    parser.add_argument("--dry-run", action="store_true", help="no API call; print prompt + validate gold debrief")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"DO model id (default: {DEFAULT_MODEL})")
    parser.add_argument("--history", action="store_true", help="feed past-session context from memory.py and store the result")
    args = parser.parse_args(argv[1:])

    transcript_path = Path(args.transcript) if args.transcript else Path(__file__).with_name("sample-transcript.json")

    if args.dry_run:
        return _dry_run(transcript_path)

    history_summary = None
    store = None
    if args.history:
        from memory import MemoryStore

        store = MemoryStore()
        history_summary = store.history_summary()

    transcript = json.loads(transcript_path.read_text(encoding="utf-8"))
    debrief = generate_debrief(transcript, args.model, history_summary)
    if store is not None:
        store.add(debrief, transcript.get("conversation_id"))
    print(json.dumps(debrief, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

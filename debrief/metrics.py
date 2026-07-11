"""Wavelength - deterministic conversation metrics.

Computes grounded, non-negotiable numbers from a speaker-labelled transcript so
the debrief reasoning model is anchored to real data instead of guessing. These
metrics get passed *into* the prompt (see SPEC.md) and rendered by the UI.

Usage:
    from metrics import compute_metrics
    metrics = compute_metrics(transcript_dict)

Or run directly to print metrics for the bundled sample conversation:
    python metrics.py [optional/path/to/transcript.json]

Input shape (see sample-transcript.json):
    {
      "user_speaker": "S1",
      "turns": [ {"speaker": "S1", "t": "00:03", "text": "..."}, ... ]
    }
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

# Only used to estimate the duration of the very last turn, which has no
# following turn to bound it. Average conversational speaking rate.
WORDS_PER_SECOND = 2.5


def _to_seconds(t: str) -> int:
    parts = [int(p) for p in t.split(":")]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    raise ValueError(f"unrecognised timestamp: {t!r}")


def _word_count(text: str) -> int:
    # Tokens of letters/digits/apostrophes. "..." and stray punctuation count 0.
    return len(re.findall(r"[A-Za-z0-9']+", text))


def compute_metrics(transcript: dict) -> dict:
    turns = transcript["turns"]
    user = transcript["user_speaker"]
    if not turns:
        return {
            "user_talk_ratio": 0.0,
            "questions_asked_by_user": 0,
            "questions_asked_by_other": 0,
            "longest_user_monologue_seconds": 0,
            "user_word_count": 0,
            "other_word_count": 0,
            "user_turns": 0,
            "other_turns": 0,
        }

    starts = [_to_seconds(t["t"]) for t in turns]
    words = [_word_count(t["text"]) for t in turns]

    # End of each turn = start of the next turn; last turn estimated from words.
    ends = []
    for i in range(len(turns)):
        if i + 1 < len(turns):
            ends.append(starts[i + 1])
        else:
            ends.append(starts[i] + round(words[i] / WORDS_PER_SECOND))

    user_words = sum(w for t, w in zip(turns, words) if t["speaker"] == user)
    other_words = sum(w for t, w in zip(turns, words) if t["speaker"] != user)
    total_words = user_words + other_words

    user_questions = sum(t["text"].count("?") for t in turns if t["speaker"] == user)
    other_questions = sum(t["text"].count("?") for t in turns if t["speaker"] != user)

    # Longest continuous stretch of the user speaking (one or more consecutive
    # user turns), measured by timestamps.
    longest = 0
    i = 0
    while i < len(turns):
        if turns[i]["speaker"] == user:
            j = i
            while j + 1 < len(turns) and turns[j + 1]["speaker"] == user:
                j += 1
            longest = max(longest, ends[j] - starts[i])
            i = j + 1
        else:
            i += 1

    return {
        "user_talk_ratio": round(user_words / total_words, 2) if total_words else 0.0,
        "questions_asked_by_user": user_questions,
        "questions_asked_by_other": other_questions,
        "longest_user_monologue_seconds": longest,
        # Extra grounding signals, handy for both the model and the UI.
        "user_word_count": user_words,
        "other_word_count": other_words,
        "user_turns": sum(1 for t in turns if t["speaker"] == user),
        "other_turns": sum(1 for t in turns if t["speaker"] != user),
    }


def _main(argv: list[str]) -> int:
    path = Path(argv[1]) if len(argv) > 1 else Path(__file__).with_name("sample-transcript.json")
    transcript = json.loads(path.read_text(encoding="utf-8"))
    print(json.dumps(compute_metrics(transcript), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(_main(sys.argv))

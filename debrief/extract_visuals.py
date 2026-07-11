"""Wavelength - visual signal extraction (the video layer).

Samples frames from a conversation recording and asks a DO vision model to
describe the conversation partner's OBSERVABLE behaviour (posture, gaze,
attention) - never emotion labels. Output is the `visual_signals` array that
run_debrief.py fuses with the transcript.

Requires ffmpeg on PATH for frame sampling.

Dry run (no API key, no ffmpeg needed) - prints the plan and the vision prompt:
    python extract_visuals.py --dry-run some-video.mp4

Real run:
    export DIGITAL_OCEAN_MODEL_ACCESS_KEY=...
    python extract_visuals.py some-video.mp4 --every 10 > visual_signals.json

Design notes:
- One frame every N seconds (default 10) keeps cost and latency sane; the
  debrief cares about trajectory, not every micro-expression.
- The prompt bans emotion verdicts. We ask "what is the person visibly doing",
  not "how do they feel". The reasoning model downstream does the hedged
  interpretation with confidence levels.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

BASE_URL = "https://inference.do-ai.run/v1/"
DEFAULT_VISION_MODEL = "anthropic-claude-haiku-4.5"  # cheap + accepts images; swap freely
DEFAULT_INTERVAL_S = 10

VISION_PROMPT = """\
This frame is from a recorded two-person conversation. Briefly describe what the person who is
NOT speaking to the camera (the conversation partner) is visibly doing, in one sentence.

Describe only observable behaviour: posture (leaning in/back), where they are looking, whether
they are turned toward or away from the speaker, gestures, whether they appear to be preparing
to leave, etc.

Do NOT label emotions (no "bored", "happy", "uncomfortable"). Do NOT guess what they are
thinking or feeling. Observable behaviour only, one sentence, no preamble.
If no second person is clearly visible, reply exactly: NO_PARTNER_VISIBLE
"""


def _fmt_ts(seconds: int) -> str:
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


def sample_frames(video: Path, every_s: int, out_dir: Path) -> list[tuple[int, Path]]:
    """Extract one JPEG every `every_s` seconds. Returns (timestamp_s, path) pairs."""
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg not found on PATH (needed for frame sampling)")
    pattern = out_dir / "frame_%05d.jpg"
    subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error",
            "-i", str(video),
            "-vf", f"fps=1/{every_s}",
            "-q:v", "3",
            str(pattern),
        ],
        check=True,
    )
    frames = sorted(out_dir.glob("frame_*.jpg"))
    return [(i * every_s, f) for i, f in enumerate(frames)]


def describe_frame(client, model: str, frame_path: Path) -> str:
    b64 = base64.b64encode(frame_path.read_bytes()).decode()
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": VISION_PROMPT},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                ],
            }
        ],
        max_completion_tokens=100,
    )
    return resp.choices[0].message.content.strip()


def extract_visual_signals(video: Path, every_s: int, model: str) -> list[dict]:
    api_key = os.getenv("DIGITAL_OCEAN_MODEL_ACCESS_KEY")
    if not api_key:
        raise RuntimeError("DIGITAL_OCEAN_MODEL_ACCESS_KEY is not set (create a model access key in the DO console)")
    from openai import OpenAI

    client = OpenAI(base_url=BASE_URL, api_key=api_key)
    signals: list[dict] = []
    with tempfile.TemporaryDirectory() as tmp:
        for ts, frame in sample_frames(video, every_s, Path(tmp)):
            desc = describe_frame(client, model, frame)
            if desc and desc != "NO_PARTNER_VISIBLE":
                signals.append({"t": _fmt_ts(ts), "observation": desc})
    return signals


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Wavelength visual signal extractor")
    parser.add_argument("video", help="path to the conversation recording (mp4/webm/...)")
    parser.add_argument("--every", type=int, default=DEFAULT_INTERVAL_S, help="seconds between sampled frames")
    parser.add_argument("--model", default=DEFAULT_VISION_MODEL, help=f"DO vision model id (default: {DEFAULT_VISION_MODEL})")
    parser.add_argument("--dry-run", action="store_true", help="print the plan and vision prompt without ffmpeg or API calls")
    args = parser.parse_args(argv[1:])

    if args.dry_run:
        print(f"plan: sample 1 frame every {args.every}s from {args.video}, "
              f"describe each with {args.model} on DO Inference, emit visual_signals JSON")
        print("\n=== vision prompt ===")
        print(VISION_PROMPT)
        print("ffmpeg available:", shutil.which("ffmpeg") is not None)
        return 0

    signals = extract_visual_signals(Path(args.video), args.every, args.model)
    print(json.dumps(signals, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

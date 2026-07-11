"""Wavelength - reference API server (deployable to DO App Platform).

Thin HTTP wrapper around the brain so the UI has a real endpoint. Reference
implementation: Dinil's architecture can absorb or replace it; the routes and
shapes are the contract.

Routes:
    GET  /health              -> {"ok": true, "mock": bool}
    POST /api/debrief         -> transcript JSON in (SPEC.md input contract),
                                 debrief JSON out (SPEC.md output contract).
                                 Query ?history=1 to use + update memory.
    GET  /api/progress        -> per-metric trends from memory (UI progress panel)

Modes:
    WAVELENGTH_MOCK=1         -> no API key needed; /api/debrief returns the gold
                                 sample debrief. Lets the UI integrate today.
    DIGITAL_OCEAN_MODEL_ACCESS_KEY set -> real inference on DO.

Local dev:
    pip install -r requirements.txt
    WAVELENGTH_MOCK=1 python server.py            # http://localhost:8080

DO App Platform: deploys via the Dockerfile in this folder (port 8080,
gunicorn --timeout 120 per DO guidance for inference workloads).
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from flask import Flask, jsonify, request

from memory import MemoryStore
from metrics import compute_metrics
from run_debrief import DEFAULT_MODEL, generate_debrief, validate_debrief

app = Flask(__name__)


# Hackathon-permissive CORS so any frontend origin (Peter's site, local viewers,
# GitHub Pages) can call the API directly from the browser.
@app.after_request
def add_cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return resp


@app.route("/api/debrief", methods=["OPTIONS"])
def debrief_preflight():
    return ("", 204)

MOCK = os.getenv("WAVELENGTH_MOCK", "").strip() not in ("", "0", "false")
GOLD_DEBRIEF = Path(__file__).with_name("sample-debrief.json")

# Only models verified to pass schema validation reliably (tested 2-3x each).
# The demo's live model-swap beat must never hit an unverified model.
ALLOWED_MODELS = {
    "anthropic-claude-haiku-4.5",   # default: ~20s, fast + solid
    "anthropic-claude-4.6-sonnet",  # quality flex: ~30s, visibly richer
}


@app.get("/health")
def health():
    return jsonify({"ok": True, "mock": MOCK})


@app.post("/api/debrief")
def debrief():
    transcript = request.get_json(silent=True)
    if not transcript or "turns" not in transcript or "user_speaker" not in transcript:
        return jsonify({"error": "body must be a transcript JSON with 'turns' and 'user_speaker' (see SPEC.md)"}), 400

    use_history = request.args.get("history", "0") not in ("0", "", "false")
    store = MemoryStore() if use_history else None

    model = request.args.get("model", os.getenv("WAVELENGTH_MODEL", DEFAULT_MODEL))
    if model not in ALLOWED_MODELS:
        return jsonify({"error": f"model not in verified allowlist: {sorted(ALLOWED_MODELS)}"}), 400

    if MOCK:
        result = json.loads(GOLD_DEBRIEF.read_text(encoding="utf-8"))
        # even in mock mode, metrics are computed for real from the input
        result["metrics"] = {
            k: v for k, v in compute_metrics(transcript).items()
            if k in ("user_talk_ratio", "questions_asked_by_user", "questions_asked_by_other", "longest_user_monologue_seconds")
        }
    else:
        try:
            history = store.history_summary() if store else None
            result = generate_debrief(transcript, model, history)
        except (RuntimeError, ValueError) as exc:
            return jsonify({"error": str(exc)}), 502

    problems = validate_debrief(result)
    if problems:
        return jsonify({"error": "debrief failed schema validation", "problems": problems}), 502

    if store is not None:
        store.add(result, transcript.get("conversation_id"))
    return jsonify(result)


@app.get("/api/progress")
def progress():
    store = MemoryStore()
    return jsonify({"sessions": len(store.sessions), "progress": store.progress()})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8080")))

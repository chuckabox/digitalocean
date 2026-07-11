"""Wavelength - longitudinal memory (the Best Use of Data layer).

Stores every debrief and turns the history into two things:
1. A `user_history_summary` string fed back into the reasoning prompt, so the
   coach can say "this has come up before" and set "recurring": true.
2. A progress view (metric trends across sessions) for the UI - the visible
   "you're improving" story.

Local-first: sessions live in a JSON file (demo-resilient, works offline at
fallback rung 3). The production shape for DO Managed Postgres + pgvector is
in schema.sql - same data, same queries, plus embedding similarity for
"you've had this exact kind of moment before".

Usage:
    python memory.py add sample-debrief.json      # store a session
    python memory.py summary                      # history summary (for the prompt)
    python memory.py progress                     # metric trends (for the UI)

    from memory import MemoryStore
    store = MemoryStore()                          # default: wavelength-memory.json
    store.add(debrief_dict)
    prompt_context = store.history_summary()
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

DEFAULT_STORE = Path(__file__).with_name("wavelength-memory.json")

# Metrics where a *lower* number is the improvement direction.
LOWER_IS_BETTER = {"user_talk_ratio", "longest_user_monologue_seconds"}
HIGHER_IS_BETTER = {"questions_asked_by_user"}


def _session_record(debrief: dict, conversation_id: str | None, n: int) -> dict:
    return {
        "conversation_id": conversation_id or f"session-{n}",
        "stored_at": int(time.time()),
        "metrics": debrief.get("metrics", {}),
        "pattern_labels": [p.get("label", "") for p in debrief.get("patterns", [])],
        "moment_gists": [
            {"t": m.get("t"), "why": m.get("why_it_matters", ""), "source": m.get("source", "audio")}
            for m in debrief.get("moments", [])
        ],
    }


class _LocalStore:
    """JSON-file store: demo-resilient, works offline (fallback rung 3)."""

    def __init__(self, path: Path | str = DEFAULT_STORE):
        self.path = Path(path)
        self.sessions: list[dict] = []
        if self.path.exists():
            self.sessions = json.loads(self.path.read_text(encoding="utf-8"))

    def add(self, debrief: dict, conversation_id: str | None = None) -> None:
        self.sessions.append(_session_record(debrief, conversation_id, len(self.sessions) + 1))
        self.path.write_text(json.dumps(self.sessions, indent=2), encoding="utf-8")

    # ---- recurring patterns ------------------------------------------------

    def recurring_labels(self) -> dict[str, int]:
        """Pattern labels seen in 2+ sessions, with counts."""
        counts: dict[str, int] = {}
        for s in self.sessions:
            for label in set(s["pattern_labels"]):
                counts[label] = counts.get(label, 0) + 1
        return {label: n for label, n in counts.items() if n >= 2}

    # ---- metric trends -----------------------------------------------------

    def metric_trend(self, key: str) -> list[float]:
        return [s["metrics"][key] for s in self.sessions if key in s.get("metrics", {})]

    def progress(self) -> dict:
        """Per-metric trajectory + a plain verdict, for the UI progress panel."""
        out: dict[str, dict] = {}
        for key in sorted(LOWER_IS_BETTER | HIGHER_IS_BETTER):
            values = self.metric_trend(key)
            if len(values) < 2:
                continue
            delta = values[-1] - values[0]
            if delta == 0:
                verdict = "steady"
            elif (delta < 0) == (key in LOWER_IS_BETTER):
                verdict = "improving"
            else:
                verdict = "watch"
            out[key] = {"values": values, "verdict": verdict}
        return out

    # ---- the string that goes into the prompt -------------------------------

    def history_summary(self) -> str | None:
        """Plain-language history context for the reasoning model. None if no history."""
        if not self.sessions:
            return None
        lines = [f"The user has {len(self.sessions)} past debriefed conversation(s)."]

        recurring = self.recurring_labels()
        if recurring:
            for label, n in sorted(recurring.items(), key=lambda kv: -kv[1]):
                lines.append(f"- '{label}' has come up in {n} sessions. If it appears again, mark it recurring.")

        for key, info in self.progress().items():
            trail = " -> ".join(f"{v:g}" for v in info["values"][-4:])
            lines.append(f"- {key}: {trail} ({info['verdict']}). Acknowledge improvement if real.")

        return "\n".join(lines)


class _PgStore(_LocalStore):
    """DO Managed Postgres store: persistent across deploys (the production shape).

    Uses the sessions table from schema.sql (debrief JSONB + metrics JSONB);
    recurring/progress/history logic is shared with the local store by loading
    rows into the same in-memory session shape.
    """

    def __init__(self, dsn: str):
        import psycopg2  # only needed when DATABASE_URL is set

        self._psycopg2 = psycopg2
        self.dsn = dsn
        self._ensure_tables()
        self.sessions = self._load()

    def _conn(self):
        return self._psycopg2.connect(self.dsn)

    def _ensure_tables(self) -> None:
        with self._conn() as c, c.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    id BIGSERIAL PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    metrics JSONB NOT NULL,
                    debrief JSONB NOT NULL
                )
                """
            )

    def _load(self) -> list[dict]:
        with self._conn() as c, c.cursor() as cur:
            cur.execute("SELECT conversation_id, EXTRACT(EPOCH FROM created_at)::bigint, metrics, debrief FROM sessions ORDER BY created_at")
            rows = cur.fetchall()
        sessions = []
        for conv_id, ts, metrics, debrief in rows:
            rec = _session_record(debrief, conv_id, len(sessions) + 1)
            rec["stored_at"] = ts
            rec["metrics"] = metrics
            sessions.append(rec)
        return sessions

    def add(self, debrief: dict, conversation_id: str | None = None) -> None:
        with self._conn() as c, c.cursor() as cur:
            cur.execute(
                "INSERT INTO sessions (conversation_id, metrics, debrief) VALUES (%s, %s, %s)",
                (
                    conversation_id or f"session-{len(self.sessions) + 1}",
                    json.dumps(debrief.get("metrics", {})),
                    json.dumps(debrief),
                ),
            )
        self.sessions = self._load()


def MemoryStore(path: Path | str = DEFAULT_STORE):
    """Factory: DO Managed Postgres when DATABASE_URL is set, else local JSON.

    Call sites just use MemoryStore() and get persistence automatically once
    the database env var lands on the app.
    """
    dsn = os.getenv("DATABASE_URL")
    if dsn:
        return _PgStore(dsn)
    return _LocalStore(path)


def _main(argv: list[str]) -> int:
    cmd = argv[1] if len(argv) > 1 else "summary"
    store = MemoryStore()

    if cmd == "add":
        debrief = json.loads(Path(argv[2]).read_text(encoding="utf-8"))
        store.add(debrief, conversation_id=argv[3] if len(argv) > 3 else None)
        print(f"stored session #{len(store.sessions)} -> {store.path.name}")
    elif cmd == "summary":
        print(store.history_summary() or "(no history yet)")
    elif cmd == "progress":
        print(json.dumps(store.progress(), indent=2))
    else:
        print(f"unknown command: {cmd} (use add|summary|progress)")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(_main(sys.argv))

"""Wavelength - signal-frame persistence (Best Use of Data backbone).

Dinil's LIVE loop emits ~1 engagement frame per second from MediaPipe. This
module batch-persists them to DO Managed Postgres so a conversation becomes a
real, queryable time series (one row per second) - the visible "Best Use of
Data" story for the judges, and what the DEBRIEF timeline replays from.

Same factory pattern as memory.py: uses Postgres when DATABASE_URL is set,
otherwise an in-memory buffer so the LIVE demo still works before the DB lands
(frames are accepted and counted; they just don't survive a restart).

    from frames import FramesStore
    store = FramesStore()
    store.add("conv-1", [{"t": 12, "engagement": 0.7, "signals": {...}, "confidence": "high"}])
    store.count("conv-1")   # -> 1
"""

from __future__ import annotations

import json
import os


def _row(conversation_id: str, f: dict) -> tuple:
    return (
        conversation_id,
        float(f.get("t", 0)),
        f.get("engagement"),
        f.get("valence"),
        f.get("attention"),
        json.dumps(f.get("signals", {})),
        str(f.get("confidence", "")) or None,
    )


class _LocalFrames:
    """In-memory buffer: keeps the LIVE demo working before Postgres exists."""

    def __init__(self):
        self._buf: dict[str, list] = {}

    def add(self, conversation_id: str, frames: list[dict]) -> int:
        self._buf.setdefault(conversation_id, []).extend(frames)
        return len(frames)

    def count(self, conversation_id: str) -> int:
        return len(self._buf.get(conversation_id, []))


class _PgFrames:
    """Postgres-backed: one row per signal frame (the production shape)."""

    def __init__(self, dsn: str):
        import psycopg2

        self._psycopg2 = psycopg2
        self.dsn = dsn
        self._ensure_table()

    def _conn(self):
        return self._psycopg2.connect(self.dsn)

    def _ensure_table(self) -> None:
        with self._conn() as c, c.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS frames (
                    id BIGSERIAL PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    t DOUBLE PRECISION NOT NULL,
                    engagement DOUBLE PRECISION,
                    valence DOUBLE PRECISION,
                    attention DOUBLE PRECISION,
                    signals JSONB,
                    confidence TEXT
                )
                """
            )
            cur.execute("CREATE INDEX IF NOT EXISTS idx_frames_conv ON frames(conversation_id, t)")

    def add(self, conversation_id: str, frames: list[dict]) -> int:
        if not frames:
            return 0
        rows = [_row(conversation_id, f) for f in frames]
        with self._conn() as c, c.cursor() as cur:
            cur.executemany(
                "INSERT INTO frames (conversation_id, t, engagement, valence, attention, signals, confidence)"
                " VALUES (%s, %s, %s, %s, %s, %s, %s)",
                rows,
            )
        return len(rows)

    def count(self, conversation_id: str) -> int:
        with self._conn() as c, c.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM frames WHERE conversation_id = %s", (conversation_id,))
            return int(cur.fetchone()[0])


# Module-level singleton so the in-memory buffer persists across requests in one
# process (each Flask request would otherwise get a fresh empty store).
_INSTANCE = None


def FramesStore():
    global _INSTANCE
    if _INSTANCE is not None:
        return _INSTANCE
    dsn = os.getenv("DATABASE_URL")
    _INSTANCE = _PgFrames(dsn) if dsn else _LocalFrames()
    return _INSTANCE

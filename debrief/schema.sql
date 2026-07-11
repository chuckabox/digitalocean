-- Wavelength - DO Managed Postgres + pgvector schema
-- Production shape of memory.py's local JSON store. Dinil: provision a managed
-- Postgres on DO, enable pgvector, run this file. The app works without it
-- (local JSON fallback); this is the scale + semantic-recall story.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
    id          BIGSERIAL PRIMARY KEY,
    handle      TEXT UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT NOT NULL REFERENCES users(id),
    conversation_id  TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- computed by metrics.py, grounded facts
    metrics          JSONB NOT NULL,
    -- full debrief JSON as returned by the reasoning model (schema in SPEC.md)
    debrief          JSONB NOT NULL
);

-- One row per flagged moment, embedded for semantic recall:
-- "you've had this exact kind of moment before" across sessions.
CREATE TABLE IF NOT EXISTS moments (
    id           BIGSERIAL PRIMARY KEY,
    session_id   BIGINT NOT NULL REFERENCES sessions(id),
    t            TEXT NOT NULL,
    source       TEXT NOT NULL DEFAULT 'audio' CHECK (source IN ('audio','video','both')),
    label        TEXT,                -- pattern label if the moment maps to one
    gist         TEXT NOT NULL,       -- observation + why_it_matters, the embedded text
    -- DO inference /v1/embeddings; dimension depends on chosen model, 1536 is a
    -- common default - adjust to the embedding model you pick.
    embedding    vector(1536)
);

-- One row per ~1 Hz signal frame from the LIVE loop (Best Use of Data backbone).
-- Written by frames.py via POST /api/frames; the DEBRIEF timeline replays from these.
CREATE TABLE IF NOT EXISTS frames (
    id              BIGSERIAL PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    t               DOUBLE PRECISION NOT NULL,   -- seconds from session start
    engagement      DOUBLE PRECISION,
    valence         DOUBLE PRECISION,
    attention       DOUBLE PRECISION,
    signals         JSONB,                       -- raw derived signal snapshot
    confidence      TEXT
);

CREATE INDEX IF NOT EXISTS idx_frames_conv ON frames(conversation_id, t);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moments_session ON moments(session_id);
-- ANN index for semantic recall (cosine). Build after some rows exist.
CREATE INDEX IF NOT EXISTS idx_moments_embedding ON moments
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- The two queries the product actually runs:

-- 1) Recurring patterns for the prompt (memory.py history_summary):
--    SELECT label, COUNT(DISTINCT session_id) AS n
--    FROM moments WHERE label IS NOT NULL
--      AND session_id IN (SELECT id FROM sessions WHERE user_id = $1)
--    GROUP BY label HAVING COUNT(DISTINCT session_id) >= 2 ORDER BY n DESC;

-- 2) "You've had this moment before" (semantic recall on a new moment's embedding):
--    SELECT gist, t, session_id FROM moments
--    WHERE session_id IN (SELECT id FROM sessions WHERE user_id = $1)
--    ORDER BY embedding <=> $2 LIMIT 3;

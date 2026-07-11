import { eq, asc } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { frames, type FrameRow } from '../db/schema.js';

/** Input shape for one signal frame (session-scoped; sessionId supplied separately). */
export interface FrameInput {
  t: number;
  engagement?: number | null;
  valence?: number | null;
  attention?: number | null;
  signals?: Record<string, number> | null;
  confidence?: 'low' | 'medium' | 'high' | null;
}

/** Batch-insert signal frames. Returns the number of rows written. */
export async function insertFrames(sessionId: string, batch: FrameInput[]): Promise<number> {
  if (batch.length === 0) return 0;
  const rows = batch.map((f) => ({
    sessionId,
    t: f.t,
    engagement: f.engagement ?? null,
    valence: f.valence ?? null,
    attention: f.attention ?? null,
    signals: f.signals ?? null,
    confidence: f.confidence ?? null,
  }));
  const inserted = await getDb().insert(frames).values(rows).returning({ id: frames.id });
  return inserted.length;
}

/** All frames for a session, ordered by time — powers the debrief timeline replay. */
export async function getFrames(sessionId: string): Promise<FrameRow[]> {
  return getDb().select().from(frames).where(eq(frames.sessionId, sessionId)).orderBy(asc(frames.t));
}

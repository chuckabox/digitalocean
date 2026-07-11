import 'dotenv/config';
import { describe, it, expect, afterAll } from 'vitest';
import {
  createSession,
  getSession,
  endSession,
  listSessions,
  deleteSession,
} from './sessions.js';
import { insertFrames, getFrames } from './frames.js';
import { closeDb } from '../db/client.js';

const hasDb = Boolean(process.env.DATABASE_URL);

// Skips cleanly in CI / anywhere without a DATABASE_URL.
describe.skipIf(!hasDb)('data layer (integration)', () => {
  let sessionId = '';

  afterAll(async () => {
    if (sessionId) await deleteSession(sessionId); // cascade-cleans frames
    await closeDb();
  });

  it('creates and fetches a session', async () => {
    const s = await createSession('catching up with a friend');
    sessionId = s.id;
    expect(s.id).toBeTruthy();
    expect(s.endedAt).toBeNull();

    const fetched = await getSession(s.id);
    expect(fetched?.context).toBe('catching up with a friend');
  });

  it('batch-inserts frames and reads them back in time order', async () => {
    const n = await insertFrames(sessionId, [
      { t: 1, engagement: 0.7 },
      { t: 0, engagement: 0.5, confidence: 'low', signals: { smile: 0.2 } },
      { t: 2, engagement: 0.9, valence: 0.4 },
    ]);
    expect(n).toBe(3);

    const rows = await getFrames(sessionId);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.t)).toEqual([0, 1, 2]); // ordered by t
    expect(rows[0]?.confidence).toBe('low');
    expect(rows[0]?.signals).toEqual({ smile: 0.2 });
  });

  it('inserting an empty batch is a no-op', async () => {
    expect(await insertFrames(sessionId, [])).toBe(0);
  });

  it('ends a session', async () => {
    const ended = await endSession(sessionId);
    expect(ended?.endedAt).toBeInstanceOf(Date);
  });

  it('lists recent sessions', async () => {
    const list = await listSessions(5);
    expect(list.some((s) => s.id === sessionId)).toBe(true);
  });
});

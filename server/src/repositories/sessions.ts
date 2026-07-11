import { eq, desc } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { sessions, type SessionRow } from '../db/schema.js';

/** Repositories are the only place SQL (via Drizzle) lives. */

export async function createSession(context?: string): Promise<SessionRow> {
  const [row] = await getDb()
    .insert(sessions)
    .values({ context: context ?? null })
    .returning();
  return row!;
}

export async function getSession(id: string): Promise<SessionRow | null> {
  const [row] = await getDb().select().from(sessions).where(eq(sessions.id, id)).limit(1);
  return row ?? null;
}

export async function endSession(id: string): Promise<SessionRow | null> {
  const [row] = await getDb()
    .update(sessions)
    .set({ endedAt: new Date() })
    .where(eq(sessions.id, id))
    .returning();
  return row ?? null;
}

export async function listSessions(limit = 20): Promise<SessionRow[]> {
  return getDb().select().from(sessions).orderBy(desc(sessions.createdAt)).limit(limit);
}

export async function deleteSession(id: string): Promise<void> {
  await getDb().delete(sessions).where(eq(sessions.id, id));
}

import {
  pgTable,
  uuid,
  bigserial,
  doublePrecision,
  jsonb,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

/** One consented conversation. */
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  /** light user context, e.g. "catching up with a friend". */
  context: text('context'),
});

/**
 * One ~1 Hz derived-signal sample from the client-side perception loop.
 * High volume (one row/sec) — bigserial id, indexed by (session, t) for replay.
 */
export const frames = pgTable(
  'frames',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    /** seconds since session start */
    t: doublePrecision('t').notNull(),
    engagement: doublePrecision('engagement'),
    valence: doublePrecision('valence'),
    attention: doublePrecision('attention'),
    signals: jsonb('signals').$type<Record<string, number>>(),
    confidence: text('confidence', { enum: ['low', 'medium', 'high'] }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_frames_session_t').on(table.sessionId, table.t)],
);

export type SessionRow = typeof sessions.$inferSelect;
export type FrameRow = typeof frames.$inferSelect;
export type FrameInsert = typeof frames.$inferInsert;

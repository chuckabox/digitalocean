import type { SessionResponse } from 'shared';
import type { SessionRow } from '../db/schema.js';

export function toSessionResponse(row: SessionRow): SessionResponse {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    context: row.context,
  };
}

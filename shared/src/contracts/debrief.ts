import { z } from 'zod';
import { SignalFrameSchema } from '../domain/signals.js';

export const TranscriptTurnSchema = z.object({
  speaker: z.enum(['user', 'partner']),
  /** seconds since session start */
  t: z.number().nonnegative(),
  text: z.string().min(1),
});
export type TranscriptTurn = z.infer<typeof TranscriptTurnSchema>;

/** POST /v1/debrief — response is text/event-stream, not JSON. */
export const DebriefRequestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  context: z.string().max(2000).optional(),
  transcript: z.array(TranscriptTurnSchema).max(500).optional(),
  frames: z.array(SignalFrameSchema).max(3600).optional(),
  /** Demo model-swap: smart=Sonnet (default), fast=Haiku */
  tier: z.enum(['fast', 'smart']).optional(),
});
export type DebriefRequest = z.infer<typeof DebriefRequestSchema>;

/** Normalized request after applying defaults. */
export type DebriefInput = DebriefRequest & { transcript: TranscriptTurn[] };

/** One SSE `data:` payload. */
export const DebriefSseEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('delta'), text: z.string() }),
  z.object({ type: z.literal('done') }),
  z.object({ type: z.literal('error'), message: z.string() }),
]);
export type DebriefSseEvent = z.infer<typeof DebriefSseEventSchema>;

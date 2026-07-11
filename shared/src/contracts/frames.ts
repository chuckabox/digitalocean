import { z } from 'zod';
import { SignalFrameSchema } from '../domain/signals.js';

/** POST /v1/frames — batch ingest (~1 Hz samples from the client). */
export const FramesIngestRequestSchema = z.object({
  sessionId: z.string().uuid(),
  frames: z.array(SignalFrameSchema).min(1).max(120),
});
export type FramesIngestRequest = z.infer<typeof FramesIngestRequestSchema>;

export const FramesIngestResponseSchema = z.object({
  inserted: z.number().int().nonnegative(),
});
export type FramesIngestResponse = z.infer<typeof FramesIngestResponseSchema>;

/** GET /v1/sessions/:id/frames */
export const FramesListResponseSchema = z.object({
  frames: z.array(SignalFrameSchema),
});
export type FramesListResponse = z.infer<typeof FramesListResponseSchema>;

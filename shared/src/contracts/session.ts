import { z } from 'zod';

/** POST /v1/sessions */
export const SessionCreateRequestSchema = z.object({
  context: z.string().max(2000).optional(),
});
export type SessionCreateRequest = z.infer<typeof SessionCreateRequestSchema>;

/** Session resource returned by create / get / end. */
export const SessionResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  context: z.string().nullable(),
});
export type SessionResponse = z.infer<typeof SessionResponseSchema>;

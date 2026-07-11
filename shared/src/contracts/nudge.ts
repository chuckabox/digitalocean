import { z } from 'zod';
import { ConfidenceSchema, SignalFrameSchema } from '../domain/signals.js';

/** POST /v1/nudge — client decides WHEN; server phrases the hedge. */
export const NudgeRequestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  context: z.string().max(2000).optional(),
  confidence: ConfidenceSchema,
  evidence: z.array(z.string().min(1)).min(1).max(12),
  recentFrames: z.array(SignalFrameSchema).max(60).optional(),
});
export type NudgeRequest = z.infer<typeof NudgeRequestSchema>;

/** LLM-emitted fields (forced tool-call). Evidence is echoed from the request. */
export const NudgeLlmSchema = z.object({
  text: z.string().min(1).max(500),
  confidence: ConfidenceSchema,
});
export type NudgeLlm = z.infer<typeof NudgeLlmSchema>;

export const NudgeResponseSchema = z.object({
  text: z.string().min(1),
  confidence: ConfidenceSchema,
  evidence: z.array(z.string()),
});
export type NudgeResponse = z.infer<typeof NudgeResponseSchema>;

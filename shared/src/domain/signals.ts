import { z } from 'zod';

export const ConfidenceSchema = z.enum(['low', 'medium', 'high']);
export type Confidence = z.infer<typeof ConfidenceSchema>;

/** Experimental soft emotion distribution (sums ≈ 1). Hedged probabilities, not a verdict. */
export const EmotionProbsSchema = z.object({
  calm: z.number().min(0).max(1),
  happy: z.number().min(0).max(1),
  sad: z.number().min(0).max(1),
  tense: z.number().min(0).max(1),
  surprised: z.number().min(0).max(1),
  uncertain: z.number().min(0).max(1),
});
export type EmotionProbs = z.infer<typeof EmotionProbsSchema>;

/**
 * One ~5 Hz sample of derived, privacy-preserving signals from the client-side
 * perception loop. Raw video/audio never leaves the browser — only these features
 * reach the server.
 */
export const SignalFrameSchema = z.object({
  /** seconds since session start */
  t: z.number().nonnegative(),
  engagement: z.number().min(0).max(1).optional(),
  valence: z.number().min(-1).max(1).optional(),
  attention: z.number().min(0).max(1).optional(),
  /** raw derived signal snapshot (smile, gaze, ...) */
  signals: z.record(z.string(), z.number()).optional(),
  /** soft emotion-state probabilities — experimental / hedged */
  emotions: EmotionProbsSchema.optional(),
  confidence: ConfidenceSchema.optional(),
});
export type SignalFrame = z.infer<typeof SignalFrameSchema>;

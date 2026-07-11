import rateLimit from 'express-rate-limit';

/** Baseline cap for all /v1 traffic. */
export const v1Limiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'bad_request', message: 'Too many requests' } },
});

/** Stricter cap for inference-expensive endpoints (nudge + debrief). */
export const inferenceLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'bad_request', message: 'Too many inference requests' } },
});

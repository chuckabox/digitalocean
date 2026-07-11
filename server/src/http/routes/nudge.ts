import { Router } from 'express';
import { NudgeRequestSchema } from 'shared';
import { phraseNudge } from '../../services/nudge.js';
import { asyncHandler, parseBody } from '../parse.js';
import { inferenceLimiter } from '../middleware/rateLimit.js';

export const nudgeRouter: Router = Router();

nudgeRouter.post(
  '/nudge',
  inferenceLimiter,
  asyncHandler(async (req, res) => {
    const body = parseBody(NudgeRequestSchema, req.body);
    const result = await phraseNudge(body);
    res.json(result);
  }),
);

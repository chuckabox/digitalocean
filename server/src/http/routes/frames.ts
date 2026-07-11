import { Router } from 'express';
import { FramesIngestRequestSchema, type SignalFrame } from 'shared';
import { AppError } from '../../errors.js';
import * as framesRepo from '../../repositories/frames.js';
import * as sessionsRepo from '../../repositories/sessions.js';
import { asyncHandler, parseBody } from '../parse.js';

export const framesRouter: Router = Router();

framesRouter.post(
  '/frames',
  asyncHandler(async (req, res) => {
    const body = parseBody(FramesIngestRequestSchema, req.body);
    const session = await sessionsRepo.getSession(body.sessionId);
    if (!session) throw AppError.notFound('Session not found');
    const inserted = await framesRepo.insertFrames(body.sessionId, body.frames);
    res.status(201).json({ inserted });
  }),
);

framesRouter.get(
  '/sessions/:id/frames',
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const session = await sessionsRepo.getSession(id);
    if (!session) throw AppError.notFound('Session not found');
    const rows = await framesRepo.getFrames(id);
    const frames: SignalFrame[] = rows.map((r) => ({
      t: r.t,
      engagement: r.engagement ?? undefined,
      valence: r.valence ?? undefined,
      attention: r.attention ?? undefined,
      signals: r.signals ?? undefined,
      confidence: r.confidence ?? undefined,
    }));
    res.json({ frames });
  }),
);

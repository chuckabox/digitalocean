import { Router } from 'express';
import { SessionCreateRequestSchema } from 'shared';
import { AppError } from '../../errors.js';
import * as sessionsRepo from '../../repositories/sessions.js';
import { asyncHandler, parseBody } from '../parse.js';
import { toSessionResponse } from '../mappers.js';

export const sessionsRouter: Router = Router();

sessionsRouter.post(
  '/sessions',
  asyncHandler(async (req, res) => {
    const body = parseBody(SessionCreateRequestSchema, req.body ?? {});
    const row = await sessionsRepo.createSession(body.context);
    res.status(201).json(toSessionResponse(row));
  }),
);

sessionsRouter.get(
  '/sessions/:id',
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const row = await sessionsRepo.getSession(id);
    if (!row) throw AppError.notFound('Session not found');
    res.json(toSessionResponse(row));
  }),
);

sessionsRouter.post(
  '/sessions/:id/end',
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const row = await sessionsRepo.endSession(id);
    if (!row) throw AppError.notFound('Session not found');
    res.json(toSessionResponse(row));
  }),
);

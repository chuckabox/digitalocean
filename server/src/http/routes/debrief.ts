import { Router } from 'express';
import { DebriefRequestSchema, type DebriefSseEvent } from 'shared';
import { streamDebrief } from '../../services/debrief.js';
import { asyncHandler, parseBody } from '../parse.js';

export const debriefRouter: Router = Router();

function writeSse(res: import('express').Response, event: DebriefSseEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

debriefRouter.post(
  '/debrief',
  asyncHandler(async (req, res) => {
    const body = parseBody(DebriefRequestSchema, req.body ?? {});

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      for await (const delta of streamDebrief(body)) {
        writeSse(res, { type: 'delta', text: delta });
      }
      writeSse(res, { type: 'done' });
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Debrief stream failed';
      writeSse(res, { type: 'error', message });
      res.end();
    }
  }),
);

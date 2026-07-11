import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from './logger.js';
import { AppError } from './errors.js';
import { requestId } from './http/middleware/requestId.js';
import { corsMiddleware } from './http/middleware/cors.js';
import { errorHandler } from './http/middleware/errorHandler.js';
import { v1Limiter } from './http/middleware/rateLimit.js';
import { healthRouter } from './http/routes/health.js';
import { sessionsRouter } from './http/routes/sessions.js';
import { framesRouter } from './http/routes/frames.js';
import { nudgeRouter } from './http/routes/nudge.js';
import { debriefRouter } from './http/routes/debrief.js';
import { mountClientStatic } from './http/static.js';

/** Assemble the Express app. Kept pure (no listen) so tests can drive it directly. */
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  // App Platform (and most PaaS) terminate TLS at a proxy.
  app.set('trust proxy', 1);

  app.use(requestId);
  app.use(pinoHttp({ logger, genReqId: (req) => (req as { id?: string }).id ?? '' }));
  app.use(corsMiddleware);
  app.use(express.json({ limit: '1mb' }));

  app.use('/', healthRouter);

  const v1 = express.Router();
  v1.use(v1Limiter);
  v1.use(sessionsRouter);
  v1.use(framesRouter);
  v1.use(nudgeRouter);
  v1.use(debriefRouter);
  app.use('/v1', v1);

  mountClientStatic(app);

  // Unmatched route -> 404 through the error envelope.
  app.use((_req, _res, next) => next(AppError.notFound()));
  app.use(errorHandler);

  return app;
}

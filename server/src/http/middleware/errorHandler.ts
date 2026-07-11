import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, type ErrorEnvelope } from '../../errors.js';
import { logger } from '../../logger.js';

/** Terminal error handler — turns anything thrown into a consistent envelope. */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  let appErr: AppError;

  if (err instanceof AppError) {
    appErr = err;
  } else if (err instanceof ZodError) {
    appErr = AppError.validation('Request validation failed', err.issues);
  } else {
    appErr = new AppError('internal_error', 500, 'Internal server error');
    logger.error({ err, requestId: req.id }, 'Unhandled error');
  }

  if (appErr.code !== 'internal_error') {
    logger.warn(
      {
        requestId: req.id,
        code: appErr.code,
        status: appErr.statusCode,
        path: req.path,
        method: req.method,
        message: appErr.message,
      },
      'Request failed',
    );
  }

  const envelope: ErrorEnvelope = {
    error: {
      code: appErr.code,
      message: appErr.message,
      ...(appErr.details !== undefined ? { details: appErr.details } : {}),
      requestId: String(req.id),
    },
  };
  res.status(appErr.statusCode).json(envelope);
}

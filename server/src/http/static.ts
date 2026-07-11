import fs from 'node:fs';
import path from 'node:path';
import express, { type Express, type RequestHandler } from 'express';
import { loadEnv } from '../config/env.js';
import { logger } from '../logger.js';

/**
 * Serve the Vite client build when CLIENT_DIST points at a real directory.
 * Mount after /health and /v1 so API routes win.
 */
export function mountClientStatic(app: Express): void {
  const env = loadEnv();
  const dist = env.CLIENT_DIST ? path.resolve(env.CLIENT_DIST) : null;
  if (!dist || !fs.existsSync(dist)) {
    if (env.CLIENT_DIST) {
      logger.warn({ dist }, 'CLIENT_DIST set but directory missing — skipping static serve');
    }
    return;
  }

  const indexHtml = path.join(dist, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    logger.warn({ dist }, 'CLIENT_DIST has no index.html — skipping static serve');
    return;
  }

  logger.info({ dist }, 'Serving client build');
  app.use(express.static(dist, { index: false, fallthrough: true }));

  const spaFallback: RequestHandler = (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/v1') || req.path === '/health' || req.path === '/ready') {
      return next();
    }
    res.sendFile(indexHtml, (err) => {
      if (err) next(err);
    });
  };
  app.use(spaFallback);
}

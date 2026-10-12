import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('HTTP');

/**
 * Logs method, path, status and duration only.
 * It never logs bodies, headers or query strings, so passwords,
 * tokens and API keys cannot end up in the logs.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const path = req.originalUrl.split('?')[0];
    const line = `${req.method} ${path} ${res.statusCode} ${Date.now() - start}ms`;
    if (res.statusCode >= 500) logger.error(line);
    else if (res.statusCode === 401 || res.statusCode === 403)
      logger.warn(line);
    else logger.log(line);
  });
  next();
}

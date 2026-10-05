import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../errors/AppError';
import { env } from '../config/env';

/**
 * Single place where every thrown/next(err) error in the app is turned into
 * an HTTP response. Operational errors (AppError) return their own status
 * code and message. Anything else (a genuine bug) is logged and returns a
 * generic 500 — internal details are never leaked to the client.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (10MB maximum)' : `Upload failed: ${err.message}`;
    res.status(400).json({ success: false, message, errors: [] });
    return;
  }

  // Mongoose duplicate key error
  if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    res.status(409).json({
      success: false,
      message: 'A record with this value already exists',
      errors: [],
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.error('[unhandled error]', err);

  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    errors: env.isProduction ? [] : [String(err)],
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errors: [],
  });
}

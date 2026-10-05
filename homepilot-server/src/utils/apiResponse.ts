import { Response } from 'express';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Operation completed successfully',
  statusCode = 200,
): Response {
  return res.status(statusCode).json({ success: true, message, data });
}

export function sendError(
  res: Response,
  message = 'Something went wrong',
  statusCode = 500,
  errors: unknown[] = [],
): Response {
  return res.status(statusCode).json({ success: false, message, errors });
}

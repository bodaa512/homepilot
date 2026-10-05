/**
 * Base class for all operational (expected) errors in the application.
 * Anything thrown as AppError is trusted to have a safe, user-facing message
 * and a correct HTTP status code — the global error handler uses this
 * to decide what to expose to the client vs. what to log only.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors: unknown[];

  constructor(message: string, statusCode = 500, errors: unknown[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

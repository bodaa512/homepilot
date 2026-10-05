import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../errors/specificErrors';

/**
 * Validates req.{body,query,params} against a Zod schema shaped as
 * z.object({ body: ..., query: ..., params: ... }).
 * On failure, throws a ValidationError with field-level details so the
 * global error handler can format a consistent { success:false, errors:[] } response.
 */
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      schema.parse({ body: req.body, query: req.query, params: req.params });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formatted = error.errors.map((e) => ({
          field: e.path.slice(1).join('.'), // drop leading "body"/"query"/"params"
          message: e.message,
        }));
        next(new ValidationError('Validation failed', formatted));
        return;
      }
      next(error);
    }
  };
}

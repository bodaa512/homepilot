import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { assertHomeAccess } from '../services/authorization.service';
import { AuthenticationError, AuthorizationError } from '../errors/specificErrors';

/**
 * Resource-ownership + permission check for Home-scoped routes.
 *
 * This is the backend guarantee described in ARCHITECTURE.md §55: a user
 * cannot access another user's home simply by changing the :homeId in the
 * URL — every request re-verifies membership and permission server-side,
 * regardless of what the frontend route guard already checked.
 */
export function requireHomePermission(permission: string) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AuthenticationError();

      const homeId = req.params.homeId ?? req.body?.homeId ?? req.query?.homeId;
      if (!homeId) throw new AuthorizationError('homeId is required to check permissions');

      await assertHomeAccess(req.user.id, String(homeId), permission);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Same as above but only requires an active membership — for read-only routes any role can access. */
export function requireHomeMembership() {
  return requireHomePermission(undefined as unknown as string);
}

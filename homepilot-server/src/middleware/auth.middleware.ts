import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../utils/jwt';
import { AuthenticationError, AuthorizationError } from '../errors/specificErrors';
import { User } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

/**
 * Requires a valid JWT access token in the Authorization header.
 * Never trusts a userId/role sent in the request body — identity always
 * comes from the verified token.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or malformed Authorization header');
    }
    const token = header.slice('Bearer '.length);
    const payload = verifyAccessToken(token);

    if (payload.tokenType !== 'access') {
      throw new AuthenticationError('Invalid token type');
    }

    // Confirm the user still exists and is active — a valid-but-stale token
    // (e.g. for a deactivated account) must not grant access.
    const user = await User.findById(payload.sub).select('_id role isActive');
    if (!user || !user.isActive) {
      throw new AuthenticationError('Account is no longer active');
    }

    req.user = { id: user._id.toString(), role: user.role };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Access token expired'));
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid access token'));
      return;
    }
    next(error);
  }
}

/** Restricts an endpoint to specific global roles (e.g. platform_admin). */
export function requireGlobalRole(...roles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthenticationError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AuthorizationError('Insufficient global role'));
      return;
    }
    next();
  };
}

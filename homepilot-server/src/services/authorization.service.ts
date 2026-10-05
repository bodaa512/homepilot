import { HomeMembership, IHomeMembership } from '../models/HomeMembership';
import { AuthorizationError, NotFoundError } from '../errors/specificErrors';
import { homeRoleHasPermission, HomeRole } from '../constants/roles';

/**
 * Verifies the user has an active membership on the given home, and
 * optionally that their role carries a specific permission. Throws
 * NotFoundError (not AuthorizationError) when there's no membership at
 * all, so an unauthorized caller can't distinguish "not your home" from
 * "doesn't exist" — see ARCHITECTURE.md §55.
 */
export async function assertHomeAccess(
  userId: string,
  homeId: string,
  permission?: string,
): Promise<IHomeMembership> {
  const membership = await HomeMembership.findOne({ home: homeId, user: userId, status: 'active' });

  if (!membership) {
    throw new NotFoundError('Home not found');
  }

  if (permission && !homeRoleHasPermission(membership.role as HomeRole, permission)) {
    throw new AuthorizationError(`Missing permission: ${permission}`);
  }

  return membership;
}

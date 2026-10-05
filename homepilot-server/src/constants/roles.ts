/** Global account role — what kind of actor this user is on the platform. */
export enum GlobalRole {
  OWNER = 'owner',
  RENTER = 'renter',
  PROVIDER = 'provider',
  PROPERTY_MANAGER = 'property_manager',
  PLATFORM_ADMIN = 'platform_admin',
}

/** Per-home role — a user's permission level on one specific Home (via HomeMembership). */
export enum HomeRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

/**
 * Permission policy map for HomeRole, matching the matrix in ARCHITECTURE.md section 2.
 * Services/middleware should check this map rather than scattering role `if` checks
 * throughout the codebase.
 */
export const HOME_PERMISSIONS: Record<HomeRole, string[]> = {
  [HomeRole.OWNER]: [
    'home:update',
    'home:delete',
    'members:manage',
    'assets:manage',
    'documents:manage',
    'maintenance:manage',
    'maintenance:complete',
    'expenses:manage',
    'service-requests:manage',
    'analytics:view',
    'ai:use',
  ],
  [HomeRole.ADMIN]: [
    'assets:manage',
    'documents:manage',
    'maintenance:manage',
    'maintenance:complete',
    'expenses:manage',
    'members:manage',
    'service-requests:manage',
    'analytics:view',
    'ai:use',
  ],
  [HomeRole.MEMBER]: [
    'maintenance:complete',
    'service-requests:create',
    'documents:upload',
  ],
  [HomeRole.VIEWER]: ['analytics:view', 'home:read'],
};

export function homeRoleHasPermission(role: HomeRole, permission: string): boolean {
  return HOME_PERMISSIONS[role]?.includes(permission) ?? false;
}

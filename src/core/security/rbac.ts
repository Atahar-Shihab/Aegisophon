import { NextResponse } from 'next/server';
import { AuditLogRepository } from '../../repositories/audit-log.repository';

export type UserRole = 'owner' | 'admin' | 'developer' | 'viewer';

export type RbacAction =
  | 'create_key'
  | 'revoke_key'
  | 'update_policy'
  | 'inject_chaos'
  | 'reset_circuit'
  | 'read_data';

const PERMISSIONS: Record<UserRole, Set<RbacAction>> = {
  owner: new Set(['create_key', 'revoke_key', 'update_policy', 'inject_chaos', 'reset_circuit', 'read_data']),
  admin: new Set(['create_key', 'revoke_key', 'update_policy', 'inject_chaos', 'reset_circuit', 'read_data']),
  developer: new Set(['inject_chaos', 'reset_circuit', 'read_data']),
  viewer: new Set(['read_data']),
};

export class RbacService {
  public static can(role: UserRole, action: RbacAction): boolean {
    const rolePermissions = PERMISSIONS[role];
    if (!rolePermissions) return false;
    return rolePermissions.has(action);
  }

  public static enforce(
    req: Request,
    action: RbacAction
  ): { allowed: true; role: UserRole } | { allowed: false; response: NextResponse } {
    const headerRole = req.headers.get('x-aegis-role')?.toLowerCase() as UserRole | null;
    const role: UserRole = headerRole && ['owner', 'admin', 'developer', 'viewer'].includes(headerRole)
      ? headerRole
      : 'admin'; // default to admin for zero-config CLI or automated tests unless specified

    if (!this.can(role, action)) {
      const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
      AuditLogRepository.getInstance().recordSync({
        actor: `rbac_role:${role}`,
        action: 'ACCESS_DENIED_RBAC',
        targetResource: `${req.method} ${new URL(req.url).pathname}`,
        ipAddress: ip,
        diff: {
          after: {
            blockedAction: action,
            activeRole: role,
            reason: `Role '${role}' is not authorized to execute '${action}'`,
          },
        },
      });

      return {
        allowed: false,
        response: NextResponse.json(
          {
            error: 'Forbidden: Insufficient RBAC Permissions',
            code: 'FORBIDDEN_ROLE_RESTRICTION',
            message: `Current active role '${role.toUpperCase()}' does not have permission to perform '${action}'. Switch to Admin or Owner in the header.`,
            activeRole: role,
            requiredAction: action,
          },
          { status: 403 }
        ),
      };
    }

    return { allowed: true, role };
  }
}

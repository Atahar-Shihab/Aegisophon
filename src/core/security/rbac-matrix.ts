export type UserRole = 'owner' | 'admin' | 'developer' | 'viewer';

export type RbacAction =
  | 'create_key'
  | 'revoke_key'
  | 'update_policy'
  | 'inject_chaos'
  | 'reset_circuit'
  | 'read_data';

export const RBAC_PERMISSIONS: Record<UserRole, Set<RbacAction>> = {
  owner: new Set(['create_key', 'revoke_key', 'update_policy', 'inject_chaos', 'reset_circuit', 'read_data']),
  admin: new Set(['create_key', 'revoke_key', 'update_policy', 'inject_chaos', 'reset_circuit', 'read_data']),
  developer: new Set(['inject_chaos', 'reset_circuit', 'read_data']),
  viewer: new Set(['read_data']),
};

export function canPerformAction(role: UserRole, action: RbacAction): boolean {
  const rolePermissions = RBAC_PERMISSIONS[role];
  if (!rolePermissions) return false;
  return rolePermissions.has(action);
}

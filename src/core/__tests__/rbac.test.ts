import { describe, it, expect } from 'vitest';
import { RbacService } from '../security/rbac';

describe('RBAC Security Matrix & Enforcement', () => {
  it('correctly maps permissions across user roles', () => {
    // Owner
    expect(RbacService.can('owner', 'create_key')).toBe(true);
    expect(RbacService.can('owner', 'update_policy')).toBe(true);
    expect(RbacService.can('owner', 'inject_chaos')).toBe(true);

    // Admin
    expect(RbacService.can('admin', 'create_key')).toBe(true);
    expect(RbacService.can('admin', 'revoke_key')).toBe(true);

    // Developer
    expect(RbacService.can('developer', 'inject_chaos')).toBe(true);
    expect(RbacService.can('developer', 'reset_circuit')).toBe(true);
    expect(RbacService.can('developer', 'create_key')).toBe(false);
    expect(RbacService.can('developer', 'update_policy')).toBe(false);

    // Viewer (Read-only)
    expect(RbacService.can('viewer', 'read_data')).toBe(true);
    expect(RbacService.can('viewer', 'create_key')).toBe(false);
    expect(RbacService.can('viewer', 'update_policy')).toBe(false);
    expect(RbacService.can('viewer', 'inject_chaos')).toBe(false);
    expect(RbacService.can('viewer', 'reset_circuit')).toBe(false);
  });

  it('enforces RBAC via HTTP request headers', async () => {
    // Authorized request with x-aegis-role: admin
    const authReq = new Request('http://localhost:3000/api/v1/chaos', {
      method: 'POST',
      headers: { 'x-aegis-role': 'admin' },
    });
    const authResult = RbacService.enforce(authReq, 'inject_chaos');
    expect(authResult.allowed).toBe(true);

    // Forbidden request with x-aegis-role: viewer
    const forbiddenReq = new Request('http://localhost:3000/api/v1/chaos', {
      method: 'POST',
      headers: { 'x-aegis-role': 'viewer' },
    });
    const forbiddenResult = RbacService.enforce(forbiddenReq, 'inject_chaos');
    expect(forbiddenResult.allowed).toBe(false);

    if (!forbiddenResult.allowed) {
      expect(forbiddenResult.response.status).toBe(403);
      const json = await forbiddenResult.response.json();
      expect(json.code).toBe('FORBIDDEN_ROLE_RESTRICTION');
      expect(json.activeRole).toBe('viewer');
      expect(json.requiredAction).toBe('inject_chaos');
    }
  });
});

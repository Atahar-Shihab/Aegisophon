import { NextRequest, NextResponse } from 'next/server';
import { SecurityService } from '@/services/security.service';
import { AuditLogService } from '@/services/audit.service';
import { RbacService } from '@/core/security/rbac';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rbac = RbacService.enforce(req, 'revoke_key');
  if (!rbac.allowed) return rbac.response;

  const success = SecurityService.getInstance().revokeKey(params.id);
  if (!success) {
    return NextResponse.json({ error: 'Key not found' }, { status: 404 });
  }

  AuditLogService.getInstance().record({
    actor: 'admin@aegisgateway.internal',
    action: 'KEY_REVOKED',
    targetResource: `key:${params.id}`,
    ipAddress: '127.0.0.1',
    diff: {
      after: { status: 'revoked' },
    },
  });

  return NextResponse.json({ message: 'Key successfully revoked', id: params.id });
}

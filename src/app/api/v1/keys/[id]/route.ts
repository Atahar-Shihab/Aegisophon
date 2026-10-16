import { NextRequest, NextResponse } from 'next/server';
import { SecurityService } from '@/services/security.service';
import { AuditLogService } from '@/services/audit.service';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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

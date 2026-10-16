import { NextRequest, NextResponse } from 'next/server';
import { SecurityService } from '@/services/security.service';
import { AuditLogService } from '@/services/audit.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenantId') || 'tenant_enterprise_default';
  const keys = SecurityService.getInstance().listKeys(tenantId);
  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Key name is required' }, { status: 400 });
    }

    const { rawKey, record } = SecurityService.getInstance().createKey({
      name: body.name,
      tenantId: body.tenantId,
      role: body.role,
      rateLimitRpm: body.rateLimitRpm,
      rateLimitTpm: body.rateLimitTpm,
      expiresInDays: body.expiresInDays,
    });

    AuditLogService.getInstance().record({
      actor: 'admin@aegisgateway.internal',
      action: 'KEY_CREATED',
      targetResource: `key:${record.id}`,
      ipAddress: '127.0.0.1',
      diff: {
        after: { name: record.name, keyPrefix: record.keyPrefix, role: record.role },
      },
    });

    return NextResponse.json(
      {
        message: 'Key created successfully. Please copy the raw key now; it will not be displayed again.',
        rawKey,
        key: record,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error generating key';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

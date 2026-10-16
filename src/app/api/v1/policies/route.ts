import { NextRequest, NextResponse } from 'next/server';
import { PolicyService } from '@/services/policy.service';
import { AuditLogService } from '@/services/audit.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenantId') || 'tenant_enterprise_default';
  const policy = PolicyService.getInstance().getPolicy(tenantId);
  return NextResponse.json(policy);
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = body.tenantId || 'tenant_enterprise_default';
    const policyService = PolicyService.getInstance();
    const oldPolicy = policyService.getPolicy(tenantId);

    const updated = policyService.updatePolicy(tenantId, {
      mode: body.mode,
      semanticCacheThreshold: body.semanticCacheThreshold,
      complexityCutoffTier1: body.complexityCutoffTier1,
      complexityCutoffTier2: body.complexityCutoffTier2,
      primaryProvider: body.primaryProvider,
      fallbackProvider: body.fallbackProvider,
      maxMonthlyBudgetUsd: body.maxMonthlyBudgetUsd,
    });

    AuditLogService.getInstance().record({
      actor: 'admin@aegisgateway.internal',
      action: 'POLICY_UPDATED',
      targetResource: `routing_policy:${tenantId}`,
      ipAddress: '127.0.0.1',
      diff: {
        before: oldPolicy as unknown as Record<string, unknown>,
        after: updated as unknown as Record<string, unknown>,
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error updating policy';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

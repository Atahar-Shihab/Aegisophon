import { NextRequest, NextResponse } from 'next/server';
import { CircuitBreakerMesh } from '@/core/circuit-breaker/circuit-breaker';
import { ProviderType, ChaosConfig } from '@/core/types';
import { TelemetryBroadcaster } from '@/services/telemetry.service';
import { AuditLogService } from '@/services/audit.service';
import { RbacService } from '@/core/security/rbac';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rbac = RbacService.enforce(req, 'inject_chaos');
  if (!rbac.allowed) return rbac.response;

  try {
    const body = await req.json();
    const provider: ProviderType = body.provider;
    const type: 'latency_spike' | 'rate_limit_429' | 'outage_503' | 'trip_open' | 'reset' = body.type;

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
    }

    const mesh = CircuitBreakerMesh.getInstance();
    const breaker = mesh.getBreaker(provider);

    let config: ChaosConfig | undefined;

    switch (type) {
      case 'latency_spike':
        config = {
          active: true,
          forcedLatencyMs: body.latencyMs || 3500,
          description: `Simulated Latency Spike (${body.latencyMs || 3500}ms)`,
        };
        breaker.injectChaos(config);
        break;

      case 'rate_limit_429':
        config = {
          active: true,
          forcedErrorCode: 429,
          description: 'Simulated Upstream HTTP 429 Rate Limit Exceeded',
        };
        breaker.injectChaos(config);
        break;

      case 'outage_503':
        config = {
          active: true,
          forcedErrorCode: 503,
          description: 'Simulated Upstream HTTP 503 Service Outage',
        };
        breaker.injectChaos(config);
        break;

      case 'trip_open':
        breaker.manualTrip();
        break;

      case 'reset':
      default:
        breaker.clearChaos();
        breaker.manualReset();
        break;
    }

    TelemetryBroadcaster.getInstance().broadcastCircuitUpdate();
    TelemetryBroadcaster.getInstance().broadcastSnapshot();

    AuditLogService.getInstance().record({
      actor: 'dev.chaos@aegisgateway.internal',
      action: 'CHAOS_INJECTED',
      targetResource: `provider:${provider}`,
      ipAddress: '127.0.0.1',
      diff: {
        after: { type, provider, config },
      },
    });

    return NextResponse.json({
      message: `Chaos applied to ${provider}: ${type}`,
      circuit: breaker.getSnapshot(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error applying chaos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { CircuitBreakerMesh } from '@/core/circuit-breaker/circuit-breaker';
import { TelemetryBroadcaster } from '@/services/telemetry.service';
import { AuditLogService } from '@/services/audit.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const mesh = CircuitBreakerMesh.getInstance();
  const circuits = mesh.getAllSnapshots();
  return NextResponse.json({ circuits });
}

export async function POST() {
  const mesh = CircuitBreakerMesh.getInstance();
  mesh.resetAll();

  TelemetryBroadcaster.getInstance().broadcastCircuitUpdate();
  TelemetryBroadcaster.getInstance().broadcastSnapshot();

  AuditLogService.getInstance().record({
    actor: 'admin@aegisgateway.internal',
    action: 'CIRCUIT_OVERRIDE',
    targetResource: 'mesh:all_providers',
    ipAddress: '127.0.0.1',
    diff: { after: { action: 'RESET_ALL_TO_CLOSED' } },
  });

  return NextResponse.json({ message: 'All circuit breakers reset to CLOSED', circuits: mesh.getAllSnapshots() });
}

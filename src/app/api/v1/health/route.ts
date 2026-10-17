import { NextResponse } from 'next/server';
import { CircuitBreakerMesh } from '@/core/circuit-breaker/circuit-breaker';
import { SemanticVectorCache } from '@/core/cache/semantic-cache';
import { SecurityService } from '@/services/security.service';
import { TelemetryBroadcaster } from '@/services/telemetry.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const mesh = CircuitBreakerMesh.getInstance();
  const circuits = Object.values(mesh.getAllSnapshots());
  const cache = SemanticVectorCache.getInstance();
  const sec = SecurityService.getInstance();
  const broadcaster = TelemetryBroadcaster.getInstance();

  const trippedCircuits = circuits.filter((c) => c.state === 'OPEN').length;
  const halfOpenCircuits = circuits.filter((c) => c.state === 'HALF_OPEN').length;

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (trippedCircuits === circuits.length && circuits.length > 0) {
    overallStatus = 'unhealthy';
  } else if (trippedCircuits > 0 || halfOpenCircuits > 0) {
    overallStatus = 'degraded';
  }

  const mem = process.memoryUsage();

  const healthPayload = {
    status: overallStatus,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Number(process.uptime().toFixed(1)),
    subsystems: {
      circuitBreakerMesh: {
        status: trippedCircuits > 0 ? (trippedCircuits === circuits.length ? 'outage' : 'degraded') : 'operational',
        totalProviders: circuits.length,
        trippedProviders: trippedCircuits,
        halfOpenProbes: halfOpenCircuits,
      },
      semanticCache: {
        status: 'operational',
        vectorDimensions: 128,
        activeEntries: cache.size(),
        maxCapacity: 5000,
      },
      rateLimiter: {
        status: 'operational',
        algorithm: 'sliding_window_counter',
        windowSec: 60,
      },
      securityVault: {
        status: 'operational',
        hashingAlgorithm: 'SHA-256',
        activeKeys: sec.listKeys().length,
      },
      telemetryBroadcaster: {
        status: 'operational',
        transport: 'Server-Sent Events (SSE)',
        connectedClients: broadcaster.getClientCount(),
      },
    },
    providers: circuits.map((c) => ({
      providerId: c.providerId,
      providerName: c.providerName,
      state: c.state,
      failureRate: c.rollingWindowRequests > 0 ? Number((c.rollingWindowFailures / c.rollingWindowRequests).toFixed(2)) : 0,
      rollingFailures: c.rollingWindowFailures,
      ewmaLatencyMs: c.adaptiveAnomalyDetection?.ewmaLatencyMs ?? 0,
      anomalyDetected: c.adaptiveAnomalyDetection?.anomalyDetected ?? false,
      chaosOverride: c.chaosOverride?.active ? c.chaosOverride.description : null,
    })),
    memory: {
      heapUsedMB: Number((mem.heapUsed / 1024 / 1024).toFixed(2)),
      heapTotalMB: Number((mem.heapTotal / 1024 / 1024).toFixed(2)),
      rssMB: Number((mem.rss / 1024 / 1024).toFixed(2)),
    },
  };

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(healthPayload, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Aegis-Health': overallStatus,
    },
  });
}

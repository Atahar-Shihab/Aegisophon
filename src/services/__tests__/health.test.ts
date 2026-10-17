import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/v1/health/route';
import { GET as getMetrics } from '@/app/api/v1/metrics/route';
import { GET as getOpenApi } from '@/app/api/v1/openapi.json/route';

describe('System Observability & Probe API Routes', () => {
  it('GET /api/v1/health returns 200 with operational subsystems', async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toMatch(/healthy|degraded/);
    expect(json.version).toBe('1.0.0');
    expect(typeof json.uptimeSeconds).toBe('number');
    expect(json.subsystems.circuitBreakerMesh.status).toBeDefined();
    expect(json.subsystems.semanticCache.vectorDimensions).toBe(128);
    expect(Array.isArray(json.providers)).toBe(true);
    expect(json.providers.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/metrics returns text/plain with Prometheus headers', async () => {
    const res = await getMetrics();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');

    const text = await res.text();
    expect(text).toContain('aegis_gateway_requests_total');
    expect(text).toContain('aegis_circuit_breaker_state');
  });

  it('GET /api/v1/openapi.json returns valid OpenAPI 3.1.0 document', async () => {
    const res = await getOpenApi();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.openapi).toBe('3.1.0');
    expect(json.info.title).toContain('AegisGateway');
    expect(json.paths['/api/v1/gateway/completions']).toBeDefined();
    expect(json.paths['/api/v1/health']).toBeDefined();
    expect(json.paths['/api/v1/metrics']).toBeDefined();
    expect(json.paths['/api/v1/traces']).toBeDefined();
  });
});

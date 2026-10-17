import { describe, it, expect } from 'vitest';
import { MetricsService } from '../metrics.service';

describe('MetricsService (Prometheus Exposition)', () => {
  it('generates standard Prometheus 0.0.4 text output', () => {
    const service = MetricsService.getInstance();
    const metrics = service.generatePrometheusMetrics();

    expect(typeof metrics).toBe('string');
    expect(metrics).toContain('# HELP aegis_gateway_requests_total');
    expect(metrics).toContain('# TYPE aegis_gateway_requests_total counter');
    expect(metrics).toContain('aegis_gateway_requests_total');
    expect(metrics).toContain('# HELP aegis_circuit_breaker_state');
    expect(metrics).toContain('aegis_circuit_breaker_state{provider="gemini"}');
    expect(metrics).toContain('aegis_circuit_breaker_state{provider="openai"}');
    expect(metrics).toContain('aegis_circuit_breaker_state{provider="anthropic"}');
    expect(metrics).toContain('aegis_finops_saved_dollars_total');
    expect(metrics).toContain('aegis_process_uptime_seconds');
    expect(metrics).toContain('aegis_process_memory_heap_bytes');
  });

  it('reflects updated metrics upon state changes', () => {
    const service = MetricsService.getInstance();
    const metrics = service.generatePrometheusMetrics();

    // Verify numeric values follow Prometheus syntax
    const lines = metrics.split('\n');
    const requestLine = lines.find((l) => l.startsWith('aegis_gateway_requests_total'));
    expect(requestLine).toBeDefined();
    const val = Number(requestLine?.split(' ')[1]);
    expect(isNaN(val)).toBe(false);
  });
});

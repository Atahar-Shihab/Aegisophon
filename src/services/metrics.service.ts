import { TraceService } from './trace.service';
import { CircuitBreakerMesh } from '../core/circuit-breaker/circuit-breaker';
import { SemanticVectorCache } from '../core/cache/semantic-cache';

export class MetricsService {
  private static instance: MetricsService;

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  /**
   * Generates Prometheus text exposition format (version 0.0.4)
   * Scraped by Prometheus, Grafana Agent, Datadog, or OpenTelemetry Collector
   */
  public generatePrometheusMetrics(): string {
    const traceService = TraceService.getInstance();
    const agg = traceService.getAggregates();
    const mesh = CircuitBreakerMesh.getInstance();
    const circuits = Object.values(mesh.getAllSnapshots());
    const cache = SemanticVectorCache.getInstance();
    const mem = process.memoryUsage();
    const uptimeSec = process.uptime();

    const lines: string[] = [];

    // Header Metadata
    lines.push('# HELP aegis_gateway_requests_total Total number of completed gateway requests');
    lines.push('# TYPE aegis_gateway_requests_total counter');
    lines.push(`aegis_gateway_requests_total ${agg.totalRequests}`);

    lines.push('');
    lines.push('# HELP aegis_gateway_cache_hits_total Total semantic cache hits');
    lines.push('# TYPE aegis_gateway_cache_hits_total counter');
    lines.push(`aegis_gateway_cache_hits_total ${agg.cacheHits}`);

    lines.push('');
    lines.push('# HELP aegis_gateway_cache_hit_ratio Ratio of cache hits to total requests');
    lines.push('# TYPE aegis_gateway_cache_hit_ratio gauge');
    lines.push(`aegis_gateway_cache_hit_ratio ${agg.cacheHitRatio}`);

    lines.push('');
    lines.push('# HELP aegis_gateway_latency_ms_p95 Current P95 latency across all requests in ms');
    lines.push('# TYPE aegis_gateway_latency_ms_p95 gauge');
    lines.push(`aegis_gateway_latency_ms_p95 ${agg.p95LatencyMs}`);

    lines.push('');
    lines.push('# HELP aegis_gateway_latency_ms_avg Average latency across all requests in ms');
    lines.push('# TYPE aegis_gateway_latency_ms_avg gauge');
    lines.push(`aegis_gateway_latency_ms_avg ${agg.averageLatencyMs}`);

    lines.push('');
    lines.push('# HELP aegis_finops_saved_dollars_total Cumulative FinOps dollars saved via semantic caching and down-routing');
    lines.push('# TYPE aegis_finops_saved_dollars_total counter');
    lines.push(`aegis_finops_saved_dollars_total ${agg.totalDollarsSaved}`);

    lines.push('');
    lines.push('# HELP aegis_finops_actual_cost_dollars_total Cumulative actual spend across upstream LLMs');
    lines.push('# TYPE aegis_finops_actual_cost_dollars_total counter');
    lines.push(`aegis_finops_actual_cost_dollars_total ${agg.totalActualCost}`);

    lines.push('');
    lines.push('# HELP aegis_finops_tokens_processed_total Total tokens processed through gateway');
    lines.push('# TYPE aegis_finops_tokens_processed_total counter');
    lines.push(`aegis_finops_tokens_processed_total ${agg.totalTokens}`);

    lines.push('');
    lines.push('# HELP aegis_semantic_cache_entries Current number of vectors in semantic cache');
    lines.push('# TYPE aegis_semantic_cache_entries gauge');
    lines.push(`aegis_semantic_cache_entries ${cache.size()}`);

    lines.push('');
    lines.push('# HELP aegis_circuit_breaker_state Upstream circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)');
    lines.push('# TYPE aegis_circuit_breaker_state gauge');
    for (const c of circuits) {
      const stateVal = c.state === 'CLOSED' ? 0 : c.state === 'HALF_OPEN' ? 1 : 2;
      lines.push(`aegis_circuit_breaker_state{provider="${c.providerId}"} ${stateVal}`);
    }

    lines.push('');
    lines.push('# HELP aegis_circuit_breaker_failure_rate Rolling failure rate per provider (0.00-1.00)');
    lines.push('# TYPE aegis_circuit_breaker_failure_rate gauge');
    for (const c of circuits) {
      const rate = c.rollingWindowRequests > 0 ? Number((c.rollingWindowFailures / c.rollingWindowRequests).toFixed(2)) : 0;
      lines.push(`aegis_circuit_breaker_failure_rate{provider="${c.providerId}"} ${rate}`);
    }

    lines.push('');
    lines.push('# HELP aegis_circuit_breaker_consecutive_failures Current rolling failure counter');
    lines.push('# TYPE aegis_circuit_breaker_consecutive_failures gauge');
    for (const c of circuits) {
      lines.push(`aegis_circuit_breaker_consecutive_failures{provider="${c.providerId}"} ${c.rollingWindowFailures}`);
    }

    lines.push('');
    lines.push('# HELP aegis_process_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE aegis_process_uptime_seconds gauge');
    lines.push(`aegis_process_uptime_seconds ${uptimeSec.toFixed(1)}`);

    lines.push('');
    lines.push('# HELP aegis_process_memory_heap_bytes Process heap memory used in bytes');
    lines.push('# TYPE aegis_process_memory_heap_bytes gauge');
    lines.push(`aegis_process_memory_heap_bytes ${mem.heapUsed}`);

    lines.push('');
    lines.push('# HELP aegis_process_memory_rss_bytes Process RSS memory in bytes');
    lines.push('# TYPE aegis_process_memory_rss_bytes gauge');
    lines.push(`aegis_process_memory_rss_bytes ${mem.rss}`);

    return lines.join('\n') + '\n';
  }
}

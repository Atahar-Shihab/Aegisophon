import { describe, it, expect, beforeEach } from 'vitest';
import { GatewayService } from '../gateway.service';
import { SecurityService } from '../security.service';
import { CircuitBreakerMesh } from '../../core/circuit-breaker/circuit-breaker';
import { SemanticVectorCache } from '../../core/cache/semantic-cache';

describe('GatewayService Full 6-Hop Pipeline', () => {
  let gateway: GatewayService;

  beforeEach(() => {
    gateway = GatewayService.getInstance();
    CircuitBreakerMesh.getInstance().resetAll();
    SemanticVectorCache.getInstance().clear();
  });

  it('successfully executes a full pipeline completion with all 6 hops', async () => {
    const result = await gateway.execute({
      prompt: 'Explain the core principles of the Circuit Breaker pattern.',
      routingMode: 'auto-moe',
    });

    expect(result.statusCode).toBe(200);
    expect(result.response).toBeDefined();
    expect(result.response?.text).toContain('Circuit Breaker');
    expect(result.trace).toBeDefined();
    expect(result.trace?.hops.length).toBe(6);
    expect(result.trace?.hops[0].stage).toBe('auth.verify_key');
    expect(result.trace?.hops[1].stage).toBe('ratelimit.sliding_window');
    expect(result.trace?.hops[2].stage).toBe('cache.semantic_lookup');
    expect(result.trace?.hops[3].stage).toBe('router.moe_classification');
    expect(result.trace?.hops[4].stage).toBe('circuit_breaker.provider_dispatch');
    expect(result.trace?.hops[5].stage).toBe('response.stream_complete');
  });

  it('serves repeated query as semantic cache hit with 0 cost', async () => {
    const prompt = 'What is the speed of light in a vacuum?';
    // First call (cache miss)
    const miss = await gateway.execute({ prompt });
    expect(miss.response?.cacheHit).toBe(false);
    expect(miss.response?.finOps.actualCostUsd).toBeGreaterThanOrEqual(0);

    // Second call (cache hit)
    const hit = await gateway.execute({ prompt });
    expect(hit.response?.cacheHit).toBe(true);
    expect(hit.response?.finOps.actualCostUsd).toBe(0);
    expect(hit.response?.finOps.dollarsSavedUsd).toBeGreaterThan(0);
    expect(hit.trace?.hops[2].status).toBe('cache_hit');
    expect(hit.trace?.hops[3].status).toBe('skipped');
  });

  it('fails with 401 Unauthorized for invalid API key', async () => {
    const res = await gateway.execute({
      prompt: 'Test query',
      apiKey: 'ag_live_invalid_bad_key_1234567890abcdef',
    });

    expect(res.statusCode).toBe(401);
    expect(res.error).toContain('Invalid API Key');
  });

  it('fails over transparently when target provider circuit is tripped', async () => {
    // Trip gemini
    CircuitBreakerMesh.getInstance().getBreaker('gemini').manualTrip();

    const result = await gateway.execute({
      prompt: 'Hello world',
      routingMode: 'auto-moe',
    });

    expect(result.statusCode).toBe(200);
    expect(result.response?.provider).not.toBe('gemini');
  });
});

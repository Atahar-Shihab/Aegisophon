import { describe, it, expect, beforeEach } from 'vitest';
import { MoERouter } from '../router/moe-router';
import { CircuitBreakerMesh } from '../circuit-breaker/circuit-breaker';

describe('MoERouter', () => {
  let router: MoERouter;

  beforeEach(() => {
    router = MoERouter.getInstance();
    CircuitBreakerMesh.getInstance().resetAll();
  });

  it('routes low complexity query to Tier 1 fast model', () => {
    const route = router.route({
      prompt: 'Hello, what time is it?',
      routingMode: 'auto-moe',
      preferredProvider: 'gemini',
    });

    expect(route.targetTier).toBe('tier-1-fast');
    expect(route.model).toBe('gemini-1.5-flash');
    expect(route.wasFailover).toBe(false);
  });

  it('routes complex multi-step reasoning query to Tier 3 deep model', () => {
    const route = router.route({
      prompt: 'Please prove that this algorithm has time complexity O(n log n). Think step by step and analyze invariants.',
      routingMode: 'auto-moe',
      preferredProvider: 'anthropic',
    });

    expect(route.targetTier).toBe('tier-3-deep');
    expect(route.model).toBe('claude-3-7-sonnet-thinking');
  });

  it('honors quality-max policy override', () => {
    const route = router.route({
      prompt: 'Short greeting',
      routingMode: 'quality-max',
      preferredProvider: 'openai',
    });

    expect(route.targetTier).toBe('tier-3-deep');
    expect(route.model).toBe('o1');
  });

  it('detects tripped circuit and performs failover routing', () => {
    const geminiBreaker = CircuitBreakerMesh.getInstance().getBreaker('gemini');
    geminiBreaker.manualTrip();

    const route = router.route({
      prompt: 'Calculate fibonacci in TypeScript',
      routingMode: 'auto-moe',
      preferredProvider: 'gemini',
    });

    expect(route.wasFailover).toBe(true);
    expect(route.provider).not.toBe('gemini');
    expect(route.failoverHistory?.length).toBeGreaterThan(0);
  });
});

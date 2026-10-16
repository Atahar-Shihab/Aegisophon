import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderCircuitBreaker, CircuitBreakerMesh } from '../circuit-breaker/circuit-breaker';

describe('ProviderCircuitBreaker FSM', () => {
  let breaker: ProviderCircuitBreaker;

  beforeEach(() => {
    breaker = new ProviderCircuitBreaker('gemini', 'Google Gemini Mesh', {
      failureThreshold: 0.5,
      minRequestsInWindow: 4,
      windowSize: 10,
      cooldownMs: 100, // short cooldown for fast test
      p95LatencyThresholdMs: 2000,
      consecutiveSuccessThreshold: 2,
    });
  });

  it('starts in CLOSED healthy state', () => {
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.canExecute()).toBe(true);
  });

  it('trips to OPEN when failure threshold is exceeded in rolling window', () => {
    // 4 requests: 2 successes, 2 failures -> 50% failure rate
    breaker.recordSuccess(100);
    breaker.recordSuccess(120);
    expect(breaker.getState()).toBe('CLOSED');

    breaker.recordFailure('500 Internal Error');
    breaker.recordFailure('503 Service Unavailable');

    expect(breaker.getState()).toBe('OPEN');
    expect(breaker.canExecute()).toBe(false);
  });

  it('transitions to HALF_OPEN after cooldown and recovers to CLOSED after consecutive successes', async () => {
    breaker.manualTrip();
    expect(breaker.getState()).toBe('OPEN');
    expect(breaker.canExecute()).toBe(false);

    // Wait for 110ms cooldown
    await new Promise((resolve) => setTimeout(resolve, 110));

    expect(breaker.getState()).toBe('HALF_OPEN');
    expect(breaker.canExecute()).toBe(true);

    // Canary probe 1
    breaker.recordSuccess(90);
    expect(breaker.getState()).toBe('HALF_OPEN');

    // Canary probe 2 -> reaches consecutiveSuccessThreshold
    breaker.recordSuccess(95);
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.canExecute()).toBe(true);
  });

  it('trips immediately back to OPEN if canary probe fails in HALF_OPEN', async () => {
    breaker.manualTrip();
    await new Promise((resolve) => setTimeout(resolve, 110));
    expect(breaker.getState()).toBe('HALF_OPEN');

    // Canary fails
    breaker.recordFailure('Timeout');
    expect(breaker.getState()).toBe('OPEN');
  });

  it('trips when chaos fault is injected and resets when cleared', () => {
    breaker.injectChaos({ forcedErrorCode: 503, active: true });
    expect(breaker.getState()).toBe('OPEN');
    expect(breaker.canExecute()).toBe(false);

    breaker.clearChaos();
    expect(breaker.getState()).toBe('CLOSED');
    expect(breaker.canExecute()).toBe(true);
  });
});

describe('CircuitBreakerMesh Failover', () => {
  it('automatically reroutes traffic when preferred provider is tripped', () => {
    const mesh = CircuitBreakerMesh.getInstance();
    mesh.resetAll();

    const geminiBreaker = mesh.getBreaker('gemini');
    geminiBreaker.manualTrip();

    const result = mesh.resolveHealthyProvider('gemini');
    expect(result.wasFailover).toBe(true);
    expect(result.resolvedProvider).not.toBe('gemini');
    expect(result.failoverChain[0].provider).toBe('gemini');
    expect(result.failoverChain[0].state).toBe('OPEN');
  });
});

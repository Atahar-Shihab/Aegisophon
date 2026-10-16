import { describe, it, expect, beforeEach } from 'vitest';
import { SlidingWindowRateLimiter } from '../ratelimit/sliding-window';

describe('SlidingWindowRateLimiter', () => {
  let limiter: SlidingWindowRateLimiter;

  beforeEach(() => {
    limiter = SlidingWindowRateLimiter.getInstance();
    limiter.reset();
  });

  it('allows requests within RPM quota and updates remaining headers', () => {
    const res = limiter.checkLimit('test-key-1', 50, 5, 10000);
    expect(res.allowed).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.headers['X-RateLimit-Limit-RPM']).toBe('5');
    expect(res.headers['X-RateLimit-Remaining-RPM']).toBe('4');
  });

  it('blocks requests when RPM limit is exceeded with 429 status', () => {
    // Limit = 2
    limiter.checkLimit('test-key-2', 10, 2, 10000);
    limiter.checkLimit('test-key-2', 10, 2, 10000);

    const third = limiter.checkLimit('test-key-2', 10, 2, 10000);
    expect(third.allowed).toBe(false);
    expect(third.statusCode).toBe(429);
    expect(third.reason).toContain('RPM limit exceeded');
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('blocks requests when TPM limit is exceeded', () => {
    // Limit = 100 tokens
    limiter.checkLimit('test-key-3', 80, 100, 100);

    const second = limiter.checkLimit('test-key-3', 30, 100, 100);
    expect(second.allowed).toBe(false);
    expect(second.statusCode).toBe(429);
    expect(second.reason).toContain('TPM limit exceeded');
  });
});

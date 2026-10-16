export interface RateLimitResult {
  allowed: boolean;
  statusCode: number;
  reason?: string;
  retryAfterSeconds?: number;
  headers: {
    'X-RateLimit-Limit-RPM': string;
    'X-RateLimit-Remaining-RPM': string;
    'X-RateLimit-Limit-TPM': string;
    'X-RateLimit-Remaining-TPM': string;
    'X-RateLimit-Reset': string;
  };
}

interface WindowEntry {
  timestamp: number;
  tokens: number;
}

export class SlidingWindowRateLimiter {
  private static instance: SlidingWindowRateLimiter;
  private windows: Map<string, WindowEntry[]> = new Map();
  private readonly windowSizeMs = 60_000; // 1 minute sliding window

  public static getInstance(): SlidingWindowRateLimiter {
    if (!SlidingWindowRateLimiter.instance) {
      SlidingWindowRateLimiter.instance = new SlidingWindowRateLimiter();
    }
    return SlidingWindowRateLimiter.instance;
  }

  /**
   * Evaluates if request passes RPM and TPM limits
   */
  public checkLimit(
    keyId: string,
    estimatedTokens = 50,
    maxRpm = 600,
    maxTpm = 500_000
  ): RateLimitResult {
    const now = Date.now();
    const cutoff = now - this.windowSizeMs;

    let entries = this.windows.get(keyId) || [];
    // Prune entries outside the 60s sliding window
    entries = entries.filter((e) => e.timestamp > cutoff);

    const currentRequests = entries.length;
    let currentTokens = 0;
    for (let i = 0; i < entries.length; i++) {
      currentTokens += entries[i].tokens;
    }

    const oldestTimestamp = entries.length > 0 ? entries[0].timestamp : now;
    const resetTimeSeconds = Math.max(1, Math.ceil((oldestTimestamp + this.windowSizeMs - now) / 1000));

    // Check RPM
    if (currentRequests + 1 > maxRpm) {
      return {
        allowed: false,
        statusCode: 429,
        reason: `RPM limit exceeded. Max: ${maxRpm} requests/min.`,
        retryAfterSeconds: resetTimeSeconds,
        headers: {
          'X-RateLimit-Limit-RPM': String(maxRpm),
          'X-RateLimit-Remaining-RPM': '0',
          'X-RateLimit-Limit-TPM': String(maxTpm),
          'X-RateLimit-Remaining-TPM': String(Math.max(0, maxTpm - currentTokens)),
          'X-RateLimit-Reset': String(resetTimeSeconds),
        },
      };
    }

    // Check TPM
    if (currentTokens + estimatedTokens > maxTpm) {
      return {
        allowed: false,
        statusCode: 429,
        reason: `TPM limit exceeded. Max: ${maxTpm} tokens/min.`,
        retryAfterSeconds: resetTimeSeconds,
        headers: {
          'X-RateLimit-Limit-RPM': String(maxRpm),
          'X-RateLimit-Remaining-RPM': String(Math.max(0, maxRpm - currentRequests)),
          'X-RateLimit-Limit-TPM': String(maxTpm),
          'X-RateLimit-Remaining-TPM': '0',
          'X-RateLimit-Reset': String(resetTimeSeconds),
        },
      };
    }

    // Request is allowed - record into sliding window
    entries.push({ timestamp: now, tokens: estimatedTokens });
    this.windows.set(keyId, entries);

    return {
      allowed: true,
      statusCode: 200,
      headers: {
        'X-RateLimit-Limit-RPM': String(maxRpm),
        'X-RateLimit-Remaining-RPM': String(Math.max(0, maxRpm - (currentRequests + 1))),
        'X-RateLimit-Limit-TPM': String(maxTpm),
        'X-RateLimit-Remaining-TPM': String(Math.max(0, maxTpm - (currentTokens + estimatedTokens))),
        'X-RateLimit-Reset': String(resetTimeSeconds),
      },
    };
  }

  public reset(keyId?: string): void {
    if (keyId) {
      this.windows.delete(keyId);
    } else {
      this.windows.clear();
    }
  }
}

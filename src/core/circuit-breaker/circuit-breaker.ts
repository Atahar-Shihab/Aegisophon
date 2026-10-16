import { CircuitBreakerState, CircuitState, ProviderType, ChaosConfig } from '../types';

export interface CircuitBreakerOptions {
  failureThreshold?: number; // default: 0.5 (50%)
  minRequestsInWindow?: number; // default: 5
  windowSize?: number; // default: 20
  cooldownMs?: number; // default: 15000 (15s)
  p95LatencyThresholdMs?: number; // default: 3000ms
  consecutiveSuccessThreshold?: number; // default: 3
}

export class ProviderCircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private consecutiveSuccesses = 0;
  private lastFailureTime?: number;
  private lastStateChange: number = Date.now();
  private recentResults: boolean[] = []; // true = success, false = fail
  private recentLatencies: number[] = [];
  private chaosOverride?: ChaosConfig;
  private ewmaLatencyMs = 0;
  private latencyVariance = 0;
  private lastZScore = 0;
  private anomalyDetected = false;

  constructor(
    public readonly providerId: ProviderType,
    public readonly providerName: string,
    private readonly options: CircuitBreakerOptions = {}
  ) {}

  public getOptions(): Required<CircuitBreakerOptions> {
    return {
      failureThreshold: this.options.failureThreshold ?? 0.5,
      minRequestsInWindow: this.options.minRequestsInWindow ?? 5,
      windowSize: this.options.windowSize ?? 20,
      cooldownMs: this.options.cooldownMs ?? 15000,
      p95LatencyThresholdMs: this.options.p95LatencyThresholdMs ?? 3000,
      consecutiveSuccessThreshold: this.options.consecutiveSuccessThreshold ?? 3,
    };
  }

  public getState(): CircuitState {
    const opts = this.getOptions();

    // If chaos forced error is active, report OPEN if tripped
    if (this.chaosOverride?.active && (this.chaosOverride.forcedErrorCode || (this.chaosOverride.forcedLatencyMs ?? 0) > opts.p95LatencyThresholdMs)) {
      if (this.state === 'CLOSED') {
        this.transitionTo('OPEN');
      }
    }

    // Check if OPEN cooldown has elapsed -> transition to HALF_OPEN
    if (this.state === 'OPEN' && this.lastFailureTime) {
      if (Date.now() - this.lastFailureTime >= opts.cooldownMs) {
        this.transitionTo('HALF_OPEN');
      }
    }

    return this.state;
  }

  public canExecute(): boolean {
    const currentState = this.getState();
    if (currentState === 'CLOSED') return true;
    if (currentState === 'HALF_OPEN') return true; // Canary probe permitted
    return false; // OPEN
  }

  public recordSuccess(latencyMs: number): void {
    const opts = this.getOptions();
    this.successCount++;
    this.appendResult(true, latencyMs);

    // Adaptive EWMA Latency & Z-Score Anomaly Tracking
    if (this.ewmaLatencyMs === 0) {
      this.ewmaLatencyMs = latencyMs;
      this.latencyVariance = 100; // baseline variance
    } else {
      const alpha = 0.2;
      const diff = latencyMs - this.ewmaLatencyMs;
      this.ewmaLatencyMs = Number((alpha * latencyMs + (1 - alpha) * this.ewmaLatencyMs).toFixed(1));
      this.latencyVariance = Number(((1 - alpha) * (this.latencyVariance + alpha * diff * diff)).toFixed(1));
    }

    const stdDev = Math.sqrt(Math.max(1, this.latencyVariance));
    this.lastZScore = Number(((latencyMs - this.ewmaLatencyMs) / stdDev).toFixed(2));
    this.anomalyDetected = this.lastZScore >= 3.0 && this.recentLatencies.length >= 6;

    const currentState = this.getState();
    if (currentState === 'HALF_OPEN') {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= opts.consecutiveSuccessThreshold) {
        this.transitionTo('CLOSED');
      }
    } else if (currentState === 'CLOSED') {
      // Check P95 latency degradation or catastrophic latency anomaly
      const p95 = this.calculateP95Latency();
      if ((p95 > opts.p95LatencyThresholdMs || (this.anomalyDetected && latencyMs > 2500)) && this.recentResults.length >= opts.minRequestsInWindow) {
        this.transitionTo('OPEN');
      }
    }
  }

  public recordFailure(error?: string): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.appendResult(false, 0);

    const currentState = this.getState();
    if (currentState === 'HALF_OPEN') {
      // Immediate trip back to OPEN on canary failure
      this.transitionTo('OPEN');
      return;
    }

    const opts = this.getOptions();
    if (this.recentResults.length >= opts.minRequestsInWindow) {
      const failures = this.recentResults.filter((r) => !r).length;
      const failureRate = failures / this.recentResults.length;
      if (failureRate >= opts.failureThreshold) {
        this.transitionTo('OPEN');
      }
    }
  }

  public injectChaos(config: ChaosConfig): void {
    this.chaosOverride = config;
    if (config.active && (config.forcedErrorCode || (config.forcedLatencyMs ?? 0) >= 3000)) {
      this.transitionTo('OPEN');
    }
  }

  public clearChaos(): void {
    this.chaosOverride = undefined;
    if (this.state === 'OPEN') {
      this.transitionTo('CLOSED');
    }
  }

  public manualTrip(): void {
    this.transitionTo('OPEN');
  }

  public manualReset(): void {
    this.transitionTo('CLOSED');
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.lastStateChange = Date.now();
      if (newState === 'HALF_OPEN') {
        this.consecutiveSuccesses = 0;
      }
      if (newState === 'CLOSED') {
        this.consecutiveSuccesses = 0;
        this.recentResults = [];
        this.recentLatencies = [];
      }
      if (newState === 'OPEN') {
        this.lastFailureTime = Date.now();
      }
    }
  }

  private appendResult(success: boolean, latencyMs: number): void {
    const opts = this.getOptions();
    this.recentResults.push(success);
    if (this.recentResults.length > opts.windowSize) {
      this.recentResults.shift();
    }
    if (latencyMs > 0) {
      this.recentLatencies.push(latencyMs);
      if (this.recentLatencies.length > opts.windowSize) {
        this.recentLatencies.shift();
      }
    }
  }

  public calculateP95Latency(): number {
    if (this.recentLatencies.length === 0) return 0;
    const sorted = [...this.recentLatencies].sort((a, b) => a - b);
    const index = Math.ceil(0.95 * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  public getSnapshot(): CircuitBreakerState {
    const currentState = this.getState();
    const failuresInWindow = this.recentResults.filter((r) => !r).length;

    return {
      providerId: this.providerId,
      providerName: this.providerName,
      state: currentState,
      failureCount: this.failureCount,
      successCount: this.successCount,
      consecutiveSuccesses: this.consecutiveSuccesses,
      lastFailureTime: this.lastFailureTime,
      lastStateChange: this.lastStateChange,
      rollingWindowRequests: this.recentResults.length,
      rollingWindowFailures: failuresInWindow,
      p95LatencyMs: this.calculateP95Latency(),
      recentLatencies: [...this.recentLatencies],
      chaosOverride: this.chaosOverride,
      adaptiveAnomalyDetection: {
        ewmaLatencyMs: this.ewmaLatencyMs,
        latencyVariance: this.latencyVariance,
        zScore: this.lastZScore,
        anomalyDetected: this.anomalyDetected,
      },
    };
  }
}

export class CircuitBreakerMesh {
  private static instance: CircuitBreakerMesh;
  private breakers: Map<ProviderType, ProviderCircuitBreaker> = new Map();

  private constructor() {
    this.breakers.set(
      'gemini',
      new ProviderCircuitBreaker('gemini', 'Google Gemini Mesh')
    );
    this.breakers.set(
      'anthropic',
      new ProviderCircuitBreaker('anthropic', 'Anthropic Claude Mesh')
    );
    this.breakers.set(
      'openai',
      new ProviderCircuitBreaker('openai', 'OpenAI Fabric')
    );
    this.breakers.set(
      'simulator',
      new ProviderCircuitBreaker('simulator', 'Deterministic Local Simulator')
    );
  }

  public static getInstance(): CircuitBreakerMesh {
    if (!CircuitBreakerMesh.instance) {
      CircuitBreakerMesh.instance = new CircuitBreakerMesh();
    }
    return CircuitBreakerMesh.instance;
  }

  public getBreaker(provider: ProviderType): ProviderCircuitBreaker {
    const breaker = this.breakers.get(provider);
    if (!breaker) {
      const newBreaker = new ProviderCircuitBreaker(provider, provider);
      this.breakers.set(provider, newBreaker);
      return newBreaker;
    }
    return breaker;
  }

  /**
   * Resolves a healthy provider. If primary is tripped (OPEN), automatically
   * fails over to the next healthy provider in the mesh.
   */
  public resolveHealthyProvider(
    preferred: ProviderType,
    fallbackOrder: ProviderType[] = ['gemini', 'anthropic', 'openai', 'simulator']
  ): {
    resolvedProvider: ProviderType;
    wasFailover: boolean;
    failoverChain: Array<{ provider: ProviderType; state: CircuitState }>;
  } {
    const preferredBreaker = this.getBreaker(preferred);
    if (preferredBreaker.canExecute()) {
      return {
        resolvedProvider: preferred,
        wasFailover: false,
        failoverChain: [],
      };
    }

    const failoverChain: Array<{ provider: ProviderType; state: CircuitState }> = [
      { provider: preferred, state: preferredBreaker.getState() },
    ];

    for (const candidate of fallbackOrder) {
      if (candidate === preferred) continue;
      const candidateBreaker = this.getBreaker(candidate);
      if (candidateBreaker.canExecute()) {
        return {
          resolvedProvider: candidate,
          wasFailover: true,
          failoverChain,
        };
      }
      failoverChain.push({ provider: candidate, state: candidateBreaker.getState() });
    }

    // Default ultimate safety fallback is simulator
    return {
      resolvedProvider: 'simulator',
      wasFailover: true,
      failoverChain,
    };
  }

  public getAllSnapshots(): Record<ProviderType, CircuitBreakerState> {
    const result = {} as Record<ProviderType, CircuitBreakerState>;
    this.breakers.forEach((breaker, key) => {
      result[key] = breaker.getSnapshot();
    });
    return result;
  }

  public resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.manualReset();
      breaker.clearChaos();
    }
  }
}

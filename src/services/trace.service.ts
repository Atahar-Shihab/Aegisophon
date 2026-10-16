import { RequestTrace, PipelineHop, ModelTier, ProviderType } from '../core/types';

export class TraceService {
  private static instance: TraceService;
  private traces: RequestTrace[] = [];

  private constructor() {
    this.seedRealisticTraces();
  }

  public static getInstance(): TraceService {
    if (!TraceService.instance) {
      TraceService.instance = new TraceService();
    }
    return TraceService.instance;
  }

  private seedRealisticTraces(): void {
    const now = Date.now();
    const samplePrompts = [
      {
        prompt: 'How to reverse a singly linked list in TypeScript with O(1) space?',
        tier: 'tier-2-balanced' as ModelTier,
        provider: 'gemini' as ProviderType,
        model: 'gemini-1.5-pro',
        complexity: 0.58,
        cacheHit: false,
        latency: 284,
        tokensIn: 86,
        tokensOut: 240,
        status: 'succeeded' as const,
      },
      {
        prompt: 'Translate this word to French: Enterprise Observability',
        tier: 'tier-1-fast' as ModelTier,
        provider: 'anthropic' as ProviderType,
        model: 'claude-3-5-haiku',
        complexity: 0.18,
        cacheHit: false,
        latency: 112,
        tokensIn: 24,
        tokensOut: 18,
        status: 'succeeded' as const,
      },
      {
        prompt: 'How to reverse a singly linked list in TypeScript with O(1) space?',
        tier: 'tier-2-balanced' as ModelTier,
        provider: 'gemini' as ProviderType,
        model: 'gemini-1.5-pro',
        complexity: 0.58,
        cacheHit: true,
        latency: 8.4,
        tokensIn: 86,
        tokensOut: 240,
        status: 'succeeded' as const,
      },
      {
        prompt: 'Prove the loop invariant for distributed consensus under network partitions. Think step by step.',
        tier: 'tier-3-deep' as ModelTier,
        provider: 'anthropic' as ProviderType,
        model: 'claude-3-7-sonnet-thinking',
        complexity: 0.89,
        cacheHit: false,
        latency: 842,
        tokensIn: 180,
        tokensOut: 520,
        status: 'succeeded' as const,
      },
      {
        prompt: 'What is the capital of Australia?',
        tier: 'tier-1-fast' as ModelTier,
        provider: 'simulator' as ProviderType,
        model: 'simulator-fast',
        complexity: 0.12,
        cacheHit: false,
        latency: 68,
        tokensIn: 14,
        tokensOut: 12,
        status: 'succeeded' as const,
      },
      {
        prompt: 'Synthesize architecture for zero-downtime database migration with blue-green failover.',
        tier: 'tier-3-deep' as ModelTier,
        provider: 'openai' as ProviderType,
        model: 'o1',
        complexity: 0.82,
        cacheHit: false,
        latency: 710,
        tokensIn: 142,
        tokensOut: 480,
        status: 'succeeded' as const,
      },
      {
        prompt: 'Simulate upstream provider outage probe failure.',
        tier: 'tier-2-balanced' as ModelTier,
        provider: 'gemini' as ProviderType,
        model: 'gemini-1.5-pro',
        complexity: 0.44,
        cacheHit: false,
        latency: 320,
        tokensIn: 45,
        tokensOut: 120,
        status: 'fallback_routed' as const,
        failoverHistory: [{ provider: 'gemini', error: 'HTTP 503 Provider Degraded', durationMs: 2.1 }],
      },
    ];

    for (let i = 0; i < samplePrompts.length; i++) {
      const sample = samplePrompts[i];
      const traceTimestamp = new Date(now - (samplePrompts.length - i) * 12_000).toISOString();
      const actualCost = sample.cacheHit
        ? 0
        : Number(((sample.tokensIn * 0.0000015) + (sample.tokensOut * 0.000006)).toFixed(6));
      const baselineCost = Number(((sample.tokensIn * 0.000003) + (sample.tokensOut * 0.000015)).toFixed(6));
      const dollarsSaved = Number(Math.max(0, baselineCost - actualCost).toFixed(6));

      const hops: PipelineHop[] = [
        { stage: 'auth.verify_key', durationMs: 0.8, status: 'ok' },
        { stage: 'ratelimit.sliding_window', durationMs: 1.1, status: 'ok' },
        {
          stage: 'security.guardrails_audit',
          durationMs: 0.5,
          status: 'ok',
          metadata: { riskScore: 0.0, piiRedactedCount: 0 },
        },
        {
          stage: 'cache.semantic_lookup',
          durationMs: sample.cacheHit ? 6.2 : 3.8,
          status: sample.cacheHit ? 'cache_hit' : 'ok',
          metadata: { similarity: sample.cacheHit ? 0.98 : 0.42 },
        },
        {
          stage: 'router.moe_classification',
          durationMs: sample.cacheHit ? 0 : 2.4,
          status: sample.cacheHit ? 'skipped' : 'ok',
          metadata: { score: sample.complexity, tier: sample.tier },
        },
        {
          stage: 'circuit_breaker.provider_dispatch',
          durationMs: sample.cacheHit ? 0 : Number((sample.latency - 8).toFixed(1)),
          status: sample.status === 'fallback_routed' ? 'degraded' : sample.cacheHit ? 'skipped' : 'ok',
          metadata: { provider: sample.provider, model: sample.model },
        },
        {
          stage: 'response.stream_complete',
          durationMs: 0.9,
          status: 'ok',
          metadata: { totalTokens: sample.tokensIn + sample.tokensOut, costSaved: dollarsSaved },
        },
      ];

      this.traces.unshift({
        id: `tr_${Date.now().toString(36)}_${i}`,
        timestamp: traceTimestamp,
        tenantId: 'tenant_enterprise_default',
        apiKeyPrefix: 'ag_live_demo...3b1c',
        modelRequested: sample.model,
        modelRouted: sample.model,
        provider: sample.provider,
        routingTier: sample.tier,
        complexityScore: sample.complexity,
        cacheHit: sample.cacheHit,
        promptTokens: sample.tokensIn,
        completionTokens: sample.tokensOut,
        totalTokens: sample.tokensIn + sample.tokensOut,
        actualCost,
        frontierCostBaseline: baselineCost,
        dollarsSaved,
        latencyMs: sample.latency,
        statusCode: 200,
        status: sample.status,
        promptPreview: sample.prompt.substring(0, 75) + (sample.prompt.length > 75 ? '...' : ''),
        promptFull: sample.prompt,
        responsePreview: `Completed execution via ${sample.provider} [${sample.model}].`,
        hops,
        failoverHistory: sample.failoverHistory,
      });
    }
  }

  public recordTrace(trace: RequestTrace): void {
    this.traces.unshift(trace);
    if (this.traces.length > 1000) {
      this.traces.pop();
    }
  }

  public getTraces(params?: {
    limit?: number;
    provider?: string;
    tier?: string;
    status?: string;
    cacheHitOnly?: boolean;
    search?: string;
  }): RequestTrace[] {
    let result = [...this.traces];

    if (params?.provider && params.provider !== 'all') {
      result = result.filter((t) => t.provider === params.provider);
    }
    if (params?.tier && params.tier !== 'all') {
      result = result.filter((t) => t.routingTier === params.tier);
    }
    if (params?.status && params.status !== 'all') {
      result = result.filter((t) => t.status === params.status);
    }
    if (params?.cacheHitOnly) {
      result = result.filter((t) => t.cacheHit);
    }
    if (params?.search && params.search.trim().length > 0) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.promptFull.toLowerCase().includes(q) ||
          t.modelRouted.toLowerCase().includes(q) ||
          t.provider.toLowerCase().includes(q)
      );
    }

    const limit = params?.limit || 100;
    return result.slice(0, limit);
  }

  public getTraceById(id: string): RequestTrace | undefined {
    return this.traces.find((t) => t.id === id);
  }

  public getAggregates(): {
    totalRequests: number;
    cacheHits: number;
    cacheHitRatio: number;
    p95LatencyMs: number;
    averageLatencyMs: number;
    totalDollarsSaved: number;
    totalActualCost: number;
    totalTokens: number;
  } {
    if (this.traces.length === 0) {
      return {
        totalRequests: 0,
        cacheHits: 0,
        cacheHitRatio: 0,
        p95LatencyMs: 0,
        averageLatencyMs: 0,
        totalDollarsSaved: 0,
        totalActualCost: 0,
        totalTokens: 0,
      };
    }

    let cacheHits = 0;
    let totalLatency = 0;
    let totalDollarsSaved = 0;
    let totalActualCost = 0;
    let totalTokens = 0;
    const latencies: number[] = [];

    for (let i = 0; i < this.traces.length; i++) {
      const t = this.traces[i];
      if (t.cacheHit) cacheHits++;
      totalLatency += t.latencyMs;
      totalDollarsSaved += t.dollarsSaved;
      totalActualCost += t.actualCost;
      totalTokens += t.totalTokens;
      latencies.push(t.latencyMs);
    }

    latencies.sort((a, b) => a - b);
    const p95Index = Math.ceil(0.95 * latencies.length) - 1;
    const p95LatencyMs = latencies[Math.max(0, p95Index)] || 0;

    return {
      totalRequests: this.traces.length,
      cacheHits,
      cacheHitRatio: Number((cacheHits / this.traces.length).toFixed(4)),
      p95LatencyMs: Number(p95LatencyMs.toFixed(1)),
      averageLatencyMs: Number((totalLatency / this.traces.length).toFixed(1)),
      totalDollarsSaved: Number(totalDollarsSaved.toFixed(4)),
      totalActualCost: Number(totalActualCost.toFixed(4)),
      totalTokens,
    };
  }
}

import {
  GatewayCompletionRequest,
  GatewayCompletionResponse,
  PipelineHop,
  RequestTrace,
  ProviderType,
  ModelTier,
} from '../core/types';
import { SecurityService } from './security.service';
import { SlidingWindowRateLimiter } from '../core/ratelimit/sliding-window';
import { SemanticVectorCache } from '../core/cache/semantic-cache';
import { MoERouter } from '../core/router/moe-router';
import { CircuitBreakerMesh } from '../core/circuit-breaker/circuit-breaker';
import { DeterministicSimulator } from '../core/providers/simulator';
import { ProviderAdapterRegistry } from '../core/providers/adapters';
import { FinOpsLedger } from '../core/finops/ledger';
import { TraceService } from './trace.service';
import { TelemetryBroadcaster } from './telemetry.service';
import { PolicyService } from './policy.service';

export class GatewayService {
  private static instance: GatewayService;

  public static getInstance(): GatewayService {
    if (!GatewayService.instance) {
      GatewayService.instance = new GatewayService();
    }
    return GatewayService.instance;
  }

  /**
   * Executes the full 6-hop Gateway pipeline
   */
  public async execute(
    req: GatewayCompletionRequest
  ): Promise<{ response?: GatewayCompletionResponse; error?: string; statusCode: number; trace?: RequestTrace }> {
    const pipelineStart = performance.now();
    const hops: PipelineHop[] = [];
    const tenantId = req.tenantId || 'tenant_enterprise_default';
    const policy = PolicyService.getInstance().getPolicy(tenantId);
    const traceId = `tr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    // ──────────────────────────────────────────────
    // HOP 1: Auth & API Key Verification
    // ──────────────────────────────────────────────
    const hop1Start = performance.now();
    const secService = SecurityService.getInstance();
    const authResult = secService.verifyKey(req.apiKey);
    const hop1Duration = Number((performance.now() - hop1Start).toFixed(2));

    if (!authResult.valid || !authResult.record) {
      hops.push({
        stage: 'auth.verify_key',
        durationMs: hop1Duration,
        status: 'failed',
        metadata: { reason: authResult.reason },
      });
      return {
        error: authResult.reason || 'Unauthorized',
        statusCode: 401,
      };
    }

    hops.push({
      stage: 'auth.verify_key',
      durationMs: hop1Duration,
      status: 'ok',
      metadata: { keyPrefix: authResult.record.keyPrefix, role: authResult.record.role },
    });

    const apiKeyRecord = authResult.record;

    // ──────────────────────────────────────────────
    // HOP 2: Sliding-Window Rate Limiting
    // ──────────────────────────────────────────────
    const hop2Start = performance.now();
    const estimatedTokens = Math.max(1, Math.ceil((req.prompt || '').length / 4));
    const rateLimiter = SlidingWindowRateLimiter.getInstance();
    const rateResult = rateLimiter.checkLimit(
      apiKeyRecord.id,
      estimatedTokens,
      apiKeyRecord.rateLimitRpm,
      apiKeyRecord.rateLimitTpm
    );
    const hop2Duration = Number((performance.now() - hop2Start).toFixed(2));

    if (!rateResult.allowed) {
      hops.push({
        stage: 'ratelimit.sliding_window',
        durationMs: hop2Duration,
        status: 'failed',
        metadata: { reason: rateResult.reason, retryAfter: rateResult.retryAfterSeconds },
      });
      return {
        error: rateResult.reason || 'Rate limit exceeded',
        statusCode: 429,
      };
    }

    hops.push({
      stage: 'ratelimit.sliding_window',
      durationMs: hop2Duration,
      status: 'ok',
      metadata: { remainingRpm: rateResult.headers['X-RateLimit-Remaining-RPM'] },
    });

    // ──────────────────────────────────────────────
    // HOP 3: Semantic Vector Cache Lookup
    // ──────────────────────────────────────────────
    const hop3Start = performance.now();
    const semanticCache = SemanticVectorCache.getInstance();
    const cacheResult = semanticCache.lookup(req.prompt, policy.semanticCacheThreshold);
    const hop3Duration = Number((performance.now() - hop3Start).toFixed(2));

    if (cacheResult.hit && cacheResult.entry) {
      hops.push({
        stage: 'cache.semantic_lookup',
        durationMs: hop3Duration,
        status: 'cache_hit',
        metadata: {
          similarity: cacheResult.similarity,
          threshold: policy.semanticCacheThreshold,
          cachedAt: cacheResult.entry.createdAt,
        },
      });
      // Skip Router & Provider Dispatch for Cache Hit
      hops.push({ stage: 'router.moe_classification', durationMs: 0, status: 'skipped' });
      hops.push({ stage: 'circuit_breaker.provider_dispatch', durationMs: 0, status: 'skipped' });

      // Calculate FinOps savings (100% saved)
      const finOps = FinOpsLedger.calculateCost({
        model: cacheResult.entry.model,
        promptTokens: cacheResult.entry.promptTokens,
        completionTokens: cacheResult.entry.completionTokens,
        cacheHit: true,
      });

      const totalPipelineLatency = Number((performance.now() - pipelineStart).toFixed(1));

      hops.push({
        stage: 'response.stream_complete',
        durationMs: 0.6,
        status: 'ok',
        metadata: { totalLatencyMs: totalPipelineLatency, cacheHit: true },
      });

      const trace: RequestTrace = {
        id: traceId,
        timestamp: new Date().toISOString(),
        tenantId,
        apiKeyPrefix: apiKeyRecord.keyPrefix,
        modelRequested: req.model || 'auto',
        modelRouted: cacheResult.entry.model,
        provider: 'simulator',
        routingTier: 'tier-1-fast',
        complexityScore: 0.15,
        cacheHit: true,
        promptTokens: cacheResult.entry.promptTokens,
        completionTokens: cacheResult.entry.completionTokens,
        totalTokens: cacheResult.entry.promptTokens + cacheResult.entry.completionTokens,
        actualCost: 0,
        frontierCostBaseline: finOps.baselineCostUsd,
        dollarsSaved: finOps.dollarsSavedUsd,
        latencyMs: totalPipelineLatency,
        statusCode: 200,
        status: 'succeeded',
        promptPreview: req.prompt.substring(0, 80) + (req.prompt.length > 80 ? '...' : ''),
        promptFull: req.prompt,
        responsePreview: cacheResult.entry.response.substring(0, 100),
        hops,
      };

      TraceService.getInstance().recordTrace(trace);
      TelemetryBroadcaster.getInstance().broadcastTrace(trace);
      TelemetryBroadcaster.getInstance().broadcastSnapshot();

      return {
        statusCode: 200,
        trace,
        response: {
          id: traceId,
          text: cacheResult.entry.response,
          modelRouted: cacheResult.entry.model,
          provider: 'simulator',
          routingTier: 'tier-1-fast',
          complexityScore: 0.15,
          cacheHit: true,
          usage: {
            promptTokens: cacheResult.entry.promptTokens,
            completionTokens: cacheResult.entry.completionTokens,
            totalTokens: cacheResult.entry.promptTokens + cacheResult.entry.completionTokens,
          },
          finOps: {
            actualCostUsd: 0,
            baselineCostUsd: finOps.baselineCostUsd,
            dollarsSavedUsd: finOps.dollarsSavedUsd,
          },
          latencyMs: totalPipelineLatency,
          traceId,
        },
      };
    }

    hops.push({
      stage: 'cache.semantic_lookup',
      durationMs: hop3Duration,
      status: 'ok',
      metadata: { similarity: cacheResult.similarity, threshold: policy.semanticCacheThreshold, hit: false },
    });

    // ──────────────────────────────────────────────
    // HOP 4: MoE Complexity Classification & Router
    // ──────────────────────────────────────────────
    const hop4Start = performance.now();
    const router = MoERouter.getInstance();
    const route = router.route({
      prompt: req.prompt,
      requestedModel: req.model,
      routingMode: req.routingMode || policy.mode,
      tier1Cutoff: policy.complexityCutoffTier1,
      tier2Cutoff: policy.complexityCutoffTier2,
      preferredProvider: policy.primaryProvider,
    });
    const hop4Duration = Number((performance.now() - hop4Start).toFixed(2));

    hops.push({
      stage: 'router.moe_classification',
      durationMs: hop4Duration,
      status: 'ok',
      metadata: {
        score: route.complexity.score,
        tier: route.targetTier,
        provider: route.provider,
        model: route.model,
        rationale: route.routingRationale,
      },
    });

    // ──────────────────────────────────────────────
    // HOP 5: Circuit Breaker Protected Provider Dispatch
    // ──────────────────────────────────────────────
    const hop5Start = performance.now();
    const mesh = CircuitBreakerMesh.getInstance();
    const targetBreaker = mesh.getBreaker(route.provider);

    let providerResult: { text: string; promptTokens: number; completionTokens: number; latencyMs: number };
    let executionStatus: 'succeeded' | 'fallback_routed' | 'failed' = 'succeeded';
    let failoverHistory: Array<{ provider: string; error: string; durationMs: number }> | undefined = route.failoverHistory;

    try {
      // Check chaos override on breaker
      const snapshot = targetBreaker.getSnapshot();
      if (snapshot.chaosOverride?.active && snapshot.chaosOverride.forcedErrorCode) {
        throw new Error(`Injected Chaos Fault: HTTP ${snapshot.chaosOverride.forcedErrorCode}`);
      }

      if (req.model && req.model.startsWith('simulator')) {
        providerResult = await DeterministicSimulator.execute({
          prompt: req.prompt,
          model: route.model,
          chaosConfig: snapshot.chaosOverride,
        });
      } else {
        providerResult = await ProviderAdapterRegistry.execute(route.provider, {
          model: route.model,
          prompt: req.prompt,
          temperature: req.temperature,
          maxTokens: req.maxTokens,
        });
      }

      targetBreaker.recordSuccess(providerResult.latencyMs);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      targetBreaker.recordFailure(errMsg);

      // Attempt fallback failover to simulator
      const fallbackStart = performance.now();
      failoverHistory = [
        ...(failoverHistory || []),
        { provider: route.provider, error: errMsg, durationMs: Number((performance.now() - hop5Start).toFixed(1)) },
      ];

      providerResult = await DeterministicSimulator.execute({
        prompt: req.prompt,
        model: 'simulator-fast',
      });

      executionStatus = 'fallback_routed';
    }

    const hop5Duration = Number((performance.now() - hop5Start).toFixed(2));
    hops.push({
      stage: 'circuit_breaker.provider_dispatch',
      durationMs: hop5Duration,
      status: executionStatus === 'fallback_routed' ? 'degraded' : 'ok',
      metadata: {
        provider: route.provider,
        model: route.model,
        failover: executionStatus === 'fallback_routed',
      },
    });

    // ──────────────────────────────────────────────
    // HOP 6: FinOps Ledger, Cache Store & Stream Finalization
    // ──────────────────────────────────────────────
    const hop6Start = performance.now();
    const finOps = FinOpsLedger.calculateCost({
      model: route.model,
      promptTokens: providerResult.promptTokens,
      completionTokens: providerResult.completionTokens,
      cacheHit: false,
    });

    // Store in semantic cache for future hits
    semanticCache.store({
      prompt: req.prompt,
      response: providerResult.text,
      model: route.model,
      promptTokens: providerResult.promptTokens,
      completionTokens: providerResult.completionTokens,
    });

    // Track tenant spend
    PolicyService.getInstance().addSpend(tenantId, finOps.actualCostUsd);

    const hop6Duration = Number((performance.now() - hop6Start).toFixed(2));
    const totalPipelineLatency = Number((performance.now() - pipelineStart).toFixed(1));

    hops.push({
      stage: 'response.stream_complete',
      durationMs: hop6Duration,
      status: 'ok',
      metadata: {
        actualCost: finOps.actualCostUsd,
        dollarsSaved: finOps.dollarsSavedUsd,
        totalTokens: providerResult.promptTokens + providerResult.completionTokens,
      },
    });

    const trace: RequestTrace = {
      id: traceId,
      timestamp: new Date().toISOString(),
      tenantId,
      apiKeyPrefix: apiKeyRecord.keyPrefix,
      modelRequested: req.model || 'auto',
      modelRouted: route.model,
      provider: route.provider,
      routingTier: route.targetTier,
      complexityScore: route.complexity.score,
      cacheHit: false,
      promptTokens: providerResult.promptTokens,
      completionTokens: providerResult.completionTokens,
      totalTokens: providerResult.promptTokens + providerResult.completionTokens,
      actualCost: finOps.actualCostUsd,
      frontierCostBaseline: finOps.baselineCostUsd,
      dollarsSaved: finOps.dollarsSavedUsd,
      latencyMs: totalPipelineLatency,
      statusCode: 200,
      status: executionStatus,
      promptPreview: req.prompt.substring(0, 80) + (req.prompt.length > 80 ? '...' : ''),
      promptFull: req.prompt,
      responsePreview: providerResult.text.substring(0, 100),
      hops,
      failoverHistory,
    };

    TraceService.getInstance().recordTrace(trace);
    TelemetryBroadcaster.getInstance().broadcastTrace(trace);
    TelemetryBroadcaster.getInstance().broadcastSnapshot();
    TelemetryBroadcaster.getInstance().broadcastCircuitUpdate();

    return {
      statusCode: 200,
      trace,
      response: {
        id: traceId,
        text: providerResult.text,
        modelRouted: route.model,
        provider: route.provider,
        routingTier: route.targetTier,
        complexityScore: route.complexity.score,
        cacheHit: false,
        usage: {
          promptTokens: providerResult.promptTokens,
          completionTokens: providerResult.completionTokens,
          totalTokens: providerResult.promptTokens + providerResult.completionTokens,
        },
        finOps,
        latencyMs: totalPipelineLatency,
        traceId,
      },
    };
  }
}

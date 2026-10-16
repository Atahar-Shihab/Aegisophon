import { ModelTier, ProviderType, RoutingMode } from '../types';
import { PromptComplexityClassifier, ComplexityAnalysis } from '../classifier/complexity';
import { CircuitBreakerMesh } from '../circuit-breaker/circuit-breaker';

export interface RouteResolution {
  targetTier: ModelTier;
  complexity: ComplexityAnalysis;
  provider: ProviderType;
  model: string;
  wasFailover: boolean;
  failoverHistory?: Array<{ provider: string; error: string; durationMs: number }>;
  routingRationale: string;
}

export const TIER_MODELS: Record<ModelTier, Record<ProviderType, string>> = {
  'tier-1-fast': {
    gemini: 'gemini-1.5-flash',
    anthropic: 'claude-3-5-haiku',
    openai: 'gpt-4o-mini',
    simulator: 'simulator-fast',
  },
  'tier-2-balanced': {
    gemini: 'gemini-1.5-pro',
    anthropic: 'claude-3-5-sonnet',
    openai: 'gpt-4o',
    simulator: 'simulator-balanced',
  },
  'tier-3-deep': {
    gemini: 'gemini-2.0-flash-thinking',
    anthropic: 'claude-3-7-sonnet-thinking',
    openai: 'o1',
    simulator: 'simulator-deep',
  },
};

export class MoERouter {
  private static instance: MoERouter;

  public static getInstance(): MoERouter {
    if (!MoERouter.instance) {
      MoERouter.instance = new MoERouter();
    }
    return MoERouter.instance;
  }

  /**
   * Resolves routing decision based on policy, prompt complexity, and circuit mesh health
   */
  public route(params: {
    prompt: string;
    requestedModel?: string;
    routingMode?: RoutingMode;
    tier1Cutoff?: number;
    tier2Cutoff?: number;
    preferredProvider?: ProviderType;
  }): RouteResolution {
    const {
      prompt,
      requestedModel,
      routingMode = 'auto-moe',
      tier1Cutoff = 0.35,
      tier2Cutoff = 0.70,
      preferredProvider = 'gemini',
    } = params;

    // 1. Analyze Complexity
    const complexity = PromptComplexityClassifier.analyze(prompt, tier1Cutoff, tier2Cutoff);

    // 2. Determine target tier based on routing mode
    let targetTier: ModelTier = complexity.tier;
    let rationale = '';

    switch (routingMode) {
      case 'quality-max':
        targetTier = 'tier-3-deep';
        rationale = 'Policy override: Quality-Max requested. Forced route to Tier 3 Deep Reasoning.';
        break;
      case 'latency-critical':
        targetTier = 'tier-1-fast';
        rationale = 'Policy override: Latency-Critical requested. Forced route to Tier 1 Fast Edge (<100ms TTFT).';
        break;
      case 'cost-optimized':
        if (complexity.score > 0.85) {
          targetTier = 'tier-2-balanced';
          rationale = `Cost-Optimized policy: High complexity prompt (${complexity.score}) escalated to Tier 2 Balanced.`;
        } else {
          targetTier = 'tier-1-fast';
          rationale = `Cost-Optimized policy: Down-routed to Tier 1 Fast Edge for maximum FinOps savings.`;
        }
        break;
      case 'auto-moe':
      default:
        targetTier = complexity.tier;
        rationale = `Auto-MoE dynamic routing: Complexity score ${complexity.score} -> ${targetTier}. ${complexity.explanation}`;
        break;
    }

    // 3. Circuit Breaker Health & Failover Resolution
    const mesh = CircuitBreakerMesh.getInstance();
    const resolution = mesh.resolveHealthyProvider(preferredProvider);

    const activeProvider = resolution.resolvedProvider;
    const model = requestedModel || TIER_MODELS[targetTier][activeProvider] || 'simulator-fast';

    const failoverHistory = resolution.wasFailover
      ? resolution.failoverChain.map((f) => ({
          provider: f.provider,
          error: `Provider circuit state: ${f.state}`,
          durationMs: 1.2,
        }))
      : undefined;

    if (resolution.wasFailover) {
      rationale += ` [FAILOVER: Provider '${preferredProvider}' circuit tripped; dynamically rerouted to '${activeProvider}']`;
    }

    return {
      targetTier,
      complexity,
      provider: activeProvider,
      model,
      wasFailover: resolution.wasFailover,
      failoverHistory,
      routingRationale: rationale,
    };
  }
}

import { ModelTier, ProviderType } from '../types';

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  tier: ModelTier;
  provider: ProviderType;
}

export const PRICING_CATALOG: Record<string, ModelPricing> = {
  // Tier 1 Fast / Edge
  'gemini-1.5-flash': { inputPerMillion: 0.075, outputPerMillion: 0.30, tier: 'tier-1-fast', provider: 'gemini' },
  'claude-3-5-haiku': { inputPerMillion: 0.25, outputPerMillion: 1.25, tier: 'tier-1-fast', provider: 'anthropic' },
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.60, tier: 'tier-1-fast', provider: 'openai' },
  'simulator-fast': { inputPerMillion: 0.075, outputPerMillion: 0.30, tier: 'tier-1-fast', provider: 'simulator' },

  // Tier 2 Balanced
  'gemini-1.5-pro': { inputPerMillion: 1.25, outputPerMillion: 5.00, tier: 'tier-2-balanced', provider: 'gemini' },
  'claude-3-5-sonnet': { inputPerMillion: 3.00, outputPerMillion: 15.00, tier: 'tier-2-balanced', provider: 'anthropic' },
  'gpt-4o': { inputPerMillion: 2.50, outputPerMillion: 10.00, tier: 'tier-2-balanced', provider: 'openai' },
  'simulator-balanced': { inputPerMillion: 1.50, outputPerMillion: 7.50, tier: 'tier-2-balanced', provider: 'simulator' },

  // Tier 3 Deep Reasoning
  'gemini-2.0-flash-thinking': { inputPerMillion: 0.10, outputPerMillion: 0.40, tier: 'tier-3-deep', provider: 'gemini' },
  'claude-3-7-sonnet-thinking': { inputPerMillion: 3.00, outputPerMillion: 15.00, tier: 'tier-3-deep', provider: 'anthropic' },
  'o1': { inputPerMillion: 15.00, outputPerMillion: 60.00, tier: 'tier-3-deep', provider: 'openai' },
  'simulator-deep': { inputPerMillion: 3.00, outputPerMillion: 15.00, tier: 'tier-3-deep', provider: 'simulator' },
};

// Default frontier model baseline for FinOps savings comparison (e.g. Claude 3.5/3.7 Sonnet or GPT-4o)
export const FRONTIER_BASELINE = {
  name: 'Frontier Flagship Baseline (Sonnet/GPT-4o)',
  inputPerMillion: 3.00,
  outputPerMillion: 15.00,
};

export class FinOpsLedger {
  /**
   * Calculates actual cost, baseline frontier cost, and dollar savings
   */
  public static calculateCost(params: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    cacheHit?: boolean;
  }): {
    actualCostUsd: number;
    baselineCostUsd: number;
    dollarsSavedUsd: number;
  } {
    const { model, promptTokens, completionTokens, cacheHit } = params;

    const baselineCostUsd = Number(
      (
        (promptTokens / 1_000_000) * FRONTIER_BASELINE.inputPerMillion +
        (completionTokens / 1_000_000) * FRONTIER_BASELINE.outputPerMillion
      ).toFixed(6)
    );

    // If served from cache, zero LLM provider cost
    if (cacheHit) {
      return {
        actualCostUsd: 0,
        baselineCostUsd,
        dollarsSavedUsd: baselineCostUsd,
      };
    }

    const pricing = PRICING_CATALOG[model] || {
      inputPerMillion: 1.50,
      outputPerMillion: 6.00,
      tier: 'tier-2-balanced',
      provider: 'simulator',
    };

    const actualCostUsd = Number(
      (
        (promptTokens / 1_000_000) * pricing.inputPerMillion +
        (completionTokens / 1_000_000) * pricing.outputPerMillion
      ).toFixed(6)
    );

    const dollarsSavedUsd = Number(
      Math.max(0, baselineCostUsd - actualCostUsd).toFixed(6)
    );

    return {
      actualCostUsd,
      baselineCostUsd,
      dollarsSavedUsd,
    };
  }

  /**
   * Gets pricing info for a model
   */
  public static getPricing(model: string): ModelPricing | undefined {
    return PRICING_CATALOG[model];
  }
}

import { describe, it, expect } from 'vitest';
import { FinOpsLedger } from '../finops/ledger';

describe('FinOpsLedger', () => {
  it('calculates cost savings for down-routed Tier 1 model vs Frontier baseline', () => {
    // 1000 prompt tokens, 500 completion tokens on gemini-1.5-flash
    const cost = FinOpsLedger.calculateCost({
      model: 'gemini-1.5-flash',
      promptTokens: 1000,
      completionTokens: 500,
      cacheHit: false,
    });

    expect(cost.actualCostUsd).toBeGreaterThan(0);
    expect(cost.baselineCostUsd).toBeGreaterThan(cost.actualCostUsd);
    expect(cost.dollarsSavedUsd).toBeGreaterThan(0);
  });

  it('reports $0.00 actual cost and 100% savings on cache hit', () => {
    const cost = FinOpsLedger.calculateCost({
      model: 'gpt-4o',
      promptTokens: 2000,
      completionTokens: 1000,
      cacheHit: true,
    });

    expect(cost.actualCostUsd).toBe(0);
    expect(cost.dollarsSavedUsd).toBe(cost.baselineCostUsd);
    expect(cost.dollarsSavedUsd).toBeGreaterThan(0);
  });
});

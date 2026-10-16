import { RoutingPolicy } from '../core/types';

export class PolicyService {
  private static instance: PolicyService;
  private policies: Map<string, RoutingPolicy> = new Map();

  private constructor() {
    this.policies.set('tenant_enterprise_default', {
      tenantId: 'tenant_enterprise_default',
      mode: 'auto-moe',
      semanticCacheThreshold: 0.92,
      complexityCutoffTier1: 0.35,
      complexityCutoffTier2: 0.70,
      primaryProvider: 'gemini',
      fallbackProvider: 'anthropic',
      maxMonthlyBudgetUsd: 5000,
      currentMonthlySpendUsd: 418.95,
    });
  }

  public static getInstance(): PolicyService {
    if (!PolicyService.instance) {
      PolicyService.instance = new PolicyService();
    }
    return PolicyService.instance;
  }

  public getPolicy(tenantId = 'tenant_enterprise_default'): RoutingPolicy {
    let policy = this.policies.get(tenantId);
    if (!policy) {
      policy = {
        tenantId,
        mode: 'auto-moe',
        semanticCacheThreshold: 0.92,
        complexityCutoffTier1: 0.35,
        complexityCutoffTier2: 0.70,
        primaryProvider: 'gemini',
        fallbackProvider: 'anthropic',
        maxMonthlyBudgetUsd: 5000,
        currentMonthlySpendUsd: 0,
      };
      this.policies.set(tenantId, policy);
    }
    return { ...policy };
  }

  public updatePolicy(
    tenantId: string,
    updates: Partial<Omit<RoutingPolicy, 'tenantId'>>
  ): RoutingPolicy {
    const current = this.getPolicy(tenantId);
    const updated = {
      ...current,
      ...updates,
    };
    this.policies.set(tenantId, updated);
    return { ...updated };
  }

  public addSpend(tenantId: string, amountUsd: number): void {
    const policy = this.getPolicy(tenantId);
    policy.currentMonthlySpendUsd = Number((policy.currentMonthlySpendUsd + amountUsd).toFixed(4));
    this.policies.set(tenantId, policy);
  }
}

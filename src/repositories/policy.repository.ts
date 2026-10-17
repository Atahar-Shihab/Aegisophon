import { RoutingPolicy } from '../core/types';
import { IPolicyRepository } from './types';
import { getGlobalStore } from '../lib/store';
import { WalPersistenceAdapter } from './wal-adapter';

export class PolicyRepository implements IPolicyRepository {
  private static instance: PolicyRepository;

  public static getInstance(): PolicyRepository {
    if (!PolicyRepository.instance) {
      PolicyRepository.instance = new PolicyRepository();
    }
    return PolicyRepository.instance;
  }

  public getSync(tenantId: string): RoutingPolicy {
    const store = getGlobalStore();
    const effectiveTenant = tenantId || 'tenant_enterprise_default';
    let policy = store.policies.get(effectiveTenant);
    if (!policy) {
      policy = {
        tenantId: effectiveTenant,
        mode: 'auto-moe',
        semanticCacheThreshold: 0.92,
        complexityCutoffTier1: 0.35,
        complexityCutoffTier2: 0.70,
        primaryProvider: 'gemini',
        fallbackProvider: 'anthropic',
        maxMonthlyBudgetUsd: 5000,
        currentMonthlySpendUsd: 0,
      };
      store.policies.set(effectiveTenant, policy);
      WalPersistenceAdapter.getInstance().saveStoreDebounced(store);
    }
    return { ...policy };
  }

  public async get(tenantId: string): Promise<RoutingPolicy> {
    return this.getSync(tenantId);
  }

  public updateSync(
    tenantId: string,
    updates: Partial<Omit<RoutingPolicy, 'tenantId'>>
  ): RoutingPolicy {
    const store = getGlobalStore();
    const current = this.getSync(tenantId);
    const updated: RoutingPolicy = {
      ...current,
      ...updates,
    };
    store.policies.set(tenantId, updated);
    WalPersistenceAdapter.getInstance().saveStoreSync(store);
    return { ...updated };
  }

  public async update(
    tenantId: string,
    updates: Partial<Omit<RoutingPolicy, 'tenantId'>>
  ): Promise<RoutingPolicy> {
    return this.updateSync(tenantId, updates);
  }

  public addSpendSync(tenantId: string, amountUsd: number): void {
    const store = getGlobalStore();
    const policy = this.getSync(tenantId);
    policy.currentMonthlySpendUsd = Number((policy.currentMonthlySpendUsd + amountUsd).toFixed(4));
    store.policies.set(tenantId, policy);
    WalPersistenceAdapter.getInstance().saveStoreDebounced(store);
  }

  public async addSpend(tenantId: string, amountUsd: number): Promise<void> {
    this.addSpendSync(tenantId, amountUsd);
  }

  public listAllSync(): RoutingPolicy[] {
    const store = getGlobalStore();
    return Array.from(store.policies.values()).map((p) => ({ ...p }));
  }

  public async listAll(): Promise<RoutingPolicy[]> {
    return this.listAllSync();
  }
}

import { RoutingPolicy } from '../core/types';
import { PolicyRepository } from '../repositories/policy.repository';

export class PolicyService {
  private static instance: PolicyService;
  private repository: PolicyRepository;

  private constructor() {
    this.repository = PolicyRepository.getInstance();
  }

  public static getInstance(): PolicyService {
    if (!PolicyService.instance) {
      PolicyService.instance = new PolicyService();
    }
    return PolicyService.instance;
  }

  public getPolicy(tenantId = 'tenant_enterprise_default'): RoutingPolicy {
    return this.repository.getSync(tenantId);
  }

  public updatePolicy(
    tenantId: string,
    updates: Partial<Omit<RoutingPolicy, 'tenantId'>>
  ): RoutingPolicy {
    return this.repository.updateSync(tenantId, updates);
  }

  public addSpend(tenantId: string, amountUsd: number): void {
    this.repository.addSpendSync(tenantId, amountUsd);
  }

  public listAllPolicies(): RoutingPolicy[] {
    return this.repository.listAllSync();
  }
}

import { describe, it, expect, beforeEach } from 'vitest';
import { TraceRepository } from '../trace.repository';
import { ApiKeyRepository } from '../api-key.repository';
import { PolicyRepository } from '../policy.repository';
import { AuditLogRepository } from '../audit-log.repository';
import { getGlobalStore } from '../../lib/store';
import { RequestTrace } from '../../core/types';

describe('Dual-Mode Repositories & Global Store Persistence', () => {
  beforeEach(() => {
    // Ensure global store is initialized
    getGlobalStore();
  });

  describe('TraceRepository', () => {
    it('saves and queries traces with aggregates calculation', async () => {
      const repo = TraceRepository.getInstance();
      const initialCount = await repo.count();

      const newTrace: RequestTrace = {
        id: `tr_test_${Date.now()}`,
        timestamp: new Date().toISOString(),
        tenantId: 'tenant_enterprise_default',
        apiKeyPrefix: 'ag_live_demo...',
        modelRequested: 'auto-moe',
        promptPreview: 'Test trace insertion',
        promptFull: 'Full prompt test for persistence repository',
        responsePreview: 'Persistence success',
        complexityScore: 0.42,
        routingTier: 'tier-2-balanced',
        provider: 'gemini',
        modelRouted: 'gemini-1.5-pro',
        cacheHit: false,
        promptTokens: 25,
        completionTokens: 50,
        totalTokens: 75,
        actualCost: 0.0001,
        frontierCostBaseline: 0.0005,
        dollarsSaved: 0.0004,
        latencyMs: 145.2,
        statusCode: 200,
        status: 'succeeded',
        hops: [
          { stage: 'auth.verify_key', durationMs: 0.5, status: 'ok' },
          { stage: 'circuit_breaker.provider_dispatch', durationMs: 140, status: 'ok' },
        ],
      };

      await repo.save(newTrace);
      const afterCount = await repo.count();
      expect(afterCount).toBe(initialCount + 1);

      const found = await repo.findById(newTrace.id);
      expect(found).toBeDefined();
      expect(found?.promptFull).toBe(newTrace.promptFull);

      const aggs = await repo.getAggregates();
      expect(aggs.totalRequests).toBe(afterCount);
      expect(aggs.totalTokens).toBeGreaterThan(0);
    });
  });

  describe('ApiKeyRepository', () => {
    it('manages key lifecycle and SHA-256 hash lookups', async () => {
      const repo = ApiKeyRepository.getInstance();
      const testKeyHash = 'hash_test_' + Math.random().toString(36).substring(2, 9);
      const testKeyId = 'key_test_' + Math.random().toString(36).substring(2, 9);

      const record = {
        id: testKeyId,
        name: 'Unit Test Scoped Key',
        keyPrefix: 'ag_live_test...',
        keyHash: testKeyHash,
        tenantId: 'tenant_enterprise_default',
        role: 'gateway_read_write' as const,
        rateLimitRpm: 100,
        rateLimitTpm: 50_000,
        createdAt: new Date().toISOString(),
        status: 'active' as const,
      };

      await repo.save(record);
      const foundByHash = await repo.findByHash(testKeyHash);
      expect(foundByHash).toBeDefined();
      expect(foundByHash?.id).toBe(testKeyId);

      const all = await repo.findAll('tenant_enterprise_default');
      expect(all.some((k) => k.id === testKeyId)).toBe(true);

      const deleted = await repo.delete(testKeyId);
      expect(deleted).toBe(true);
      expect(await repo.findById(testKeyId)).toBeNull();
    });
  });

  describe('PolicyRepository', () => {
    it('updates tenant routing policy and accumulates FinOps spend', async () => {
      const repo = PolicyRepository.getInstance();
      const policy = await repo.get('tenant_enterprise_default');
      expect(policy).toBeDefined();
      expect(policy.tenantId).toBe('tenant_enterprise_default');

      const initialSpend = policy.currentMonthlySpendUsd;
      await repo.addSpend('tenant_enterprise_default', 1.25);

      const updated = await repo.get('tenant_enterprise_default');
      expect(updated.currentMonthlySpendUsd).toBeCloseTo(initialSpend + 1.25, 2);

      const allPolicies = await repo.listAll();
      expect(allPolicies.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('AuditLogRepository', () => {
    it('records immutable audit events with actor diff', async () => {
      const repo = AuditLogRepository.getInstance();
      const entry = await repo.record({
        actor: 'security.auditor@test.com',
        action: 'POLICY_UPDATED',
        targetResource: 'routing_policy:test',
        ipAddress: '127.0.0.1',
        diff: { after: { test: true } },
      });

      expect(entry.id).toMatch(/^aud_/);
      const logs = await repo.findAll(10);
      expect(logs.some((l) => l.id === entry.id)).toBe(true);
    });
  });
});

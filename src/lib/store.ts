import { RequestTrace, ApiKeyRecord, RoutingPolicy, AuditLogEntry, ModelTier, ProviderType } from '../core/types';
import crypto from 'crypto';
import { WalPersistenceAdapter } from '../repositories/wal-adapter';

export interface AegisGlobalStoreState {
  traces: RequestTrace[];
  apiKeys: Map<string, ApiKeyRecord>;
  hashToKeyId: Map<string, string>;
  policies: Map<string, RoutingPolicy>;
  auditLogs: AuditLogEntry[];
  initialized: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __AEGIS_STORE__: AegisGlobalStoreState | undefined;
}

function hashKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
}

function maskKey(rawKey: string): string {
  if (rawKey.length <= 16) return rawKey;
  return `${rawKey.substring(0, 12)}...${rawKey.substring(rawKey.length - 4)}`;
}

function createInitialStoreState(): AegisGlobalStoreState {
  const store: AegisGlobalStoreState = {
    traces: [],
    apiKeys: new Map(),
    hashToKeyId: new Map(),
    policies: new Map(),
    auditLogs: [],
    initialized: true,
  };

  // 1. Seed Master Enterprise Demo Key
  const defaultMasterKey = 'ag_live_demo_enterprise_master_key_9f8a3b1c';
  const masterHash = hashKey(defaultMasterKey);
  const masterRecord: ApiKeyRecord = {
    id: 'key_master_demo',
    name: 'Default Enterprise Master Key (Root)',
    keyPrefix: maskKey(defaultMasterKey),
    keyHash: masterHash,
    tenantId: 'tenant_enterprise_default',
    role: 'admin',
    rateLimitRpm: 600,
    rateLimitTpm: 500_000,
    createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    status: 'active',
    lastUsedAt: new Date().toISOString(),
  };
  store.apiKeys.set(masterRecord.id, masterRecord);
  store.hashToKeyId.set(masterHash, masterRecord.id);

  // Seed secondary developer key
  const devKey = 'ag_live_dev_test_developer_key_4a2d8e9f';
  const devHash = hashKey(devKey);
  const devRecord: ApiKeyRecord = {
    id: 'key_dev_test',
    name: 'Development Sandbox Key',
    keyPrefix: maskKey(devKey),
    keyHash: devHash,
    tenantId: 'tenant_enterprise_default',
    role: 'gateway_read_write',
    rateLimitRpm: 120,
    rateLimitTpm: 100_000,
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    status: 'active',
    lastUsedAt: new Date().toISOString(),
  };
  store.apiKeys.set(devRecord.id, devRecord);
  store.hashToKeyId.set(devHash, devRecord.id);

  // 2. Seed Tenant Policies
  store.policies.set('tenant_enterprise_default', {
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

  store.policies.set('acme_corp_prod', {
    tenantId: 'acme_corp_prod',
    mode: 'quality-max',
    semanticCacheThreshold: 0.95,
    complexityCutoffTier1: 0.25,
    complexityCutoffTier2: 0.60,
    primaryProvider: 'anthropic',
    fallbackProvider: 'openai',
    maxMonthlyBudgetUsd: 15000,
    currentMonthlySpendUsd: 3240.10,
  });

  store.policies.set('fintech_staging', {
    tenantId: 'fintech_staging',
    mode: 'latency-critical',
    semanticCacheThreshold: 0.88,
    complexityCutoffTier1: 0.45,
    complexityCutoffTier2: 0.80,
    primaryProvider: 'gemini',
    fallbackProvider: 'simulator',
    maxMonthlyBudgetUsd: 2500,
    currentMonthlySpendUsd: 182.40,
  });

  // 3. Seed Realistic Historical Traces
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
      tokensIn: 32,
      tokensOut: 0,
      status: 'failed' as const,
    },
  ];

  const now = Date.now();
  samplePrompts.forEach((s, idx) => {
    const costActual = s.cacheHit ? 0 : Number(((s.tokensIn * 0.000003) + (s.tokensOut * 0.000015)).toFixed(6));
    const costBaseline = Number(((s.tokensIn * 0.000015) + (s.tokensOut * 0.000060)).toFixed(6));
    const saved = Number((costBaseline - costActual).toFixed(6));

    store.traces.push({
      id: `tr_seed_${(idx + 1).toString().padStart(3, '0')}`,
      timestamp: new Date(now - (samplePrompts.length - idx) * 45_000).toISOString(),
      tenantId: 'tenant_enterprise_default',
      apiKeyPrefix: masterRecord.keyPrefix,
      modelRequested: 'auto-moe',
      promptPreview: s.prompt.substring(0, 60),
      promptFull: s.prompt,
      responsePreview: s.status === 'succeeded' ? `Synthesized response for: ${s.prompt.substring(0, 40)}...` : 'Failed upstream dispatch.',
      complexityScore: s.complexity,
      routingTier: s.tier,
      provider: s.provider,
      modelRouted: s.model,
      cacheHit: s.cacheHit,
      promptTokens: s.tokensIn,
      completionTokens: s.tokensOut,
      totalTokens: s.tokensIn + s.tokensOut,
      actualCost: costActual,
      frontierCostBaseline: costBaseline,
      dollarsSaved: saved,
      latencyMs: s.latency,
      statusCode: s.status === 'succeeded' ? 200 : 503,
      status: s.status,
      hops: [
        { stage: 'auth.verify_key', durationMs: 0.4, status: 'ok' },
        { stage: 'ratelimit.sliding_window', durationMs: 0.8, status: 'ok' },
        { stage: 'security.guardrails_audit', durationMs: 1.1, status: 'ok' },
        { stage: 'cache.semantic_lookup', durationMs: 2.3, status: s.cacheHit ? 'cache_hit' : 'skipped' },
        { stage: 'router.moe_classification', durationMs: 1.8, status: 'ok' },
        { stage: 'circuit_breaker.provider_dispatch', durationMs: s.latency - 6.4, status: s.status === 'succeeded' ? 'ok' : 'failed' },
        { stage: 'response.stream_complete', durationMs: 0.6, status: 'ok' },
      ],
    });
  });

  // 4. Seed Baseline Audit Logs
  store.auditLogs.push(
    {
      id: 'aud_01HX9A1',
      timestamp: new Date(now - 3600_000 * 24).toISOString(),
      actor: 'system.admin@aegisgateway.internal',
      action: 'KEY_CREATED',
      targetResource: masterRecord.keyPrefix,
      ipAddress: '10.0.4.12',
      diff: { after: { role: 'admin', rateLimitRpm: 600, rateLimitTpm: 500000 } },
    },
    {
      id: 'aud_01HX9A2',
      timestamp: new Date(now - 3600_000 * 12).toISOString(),
      actor: 'platform.engineer@aegisgateway.internal',
      action: 'POLICY_UPDATED',
      targetResource: 'routing_policy:tenant_enterprise_default',
      ipAddress: '192.168.1.45',
      diff: {
        before: { semanticCacheThreshold: 0.90, mode: 'auto-moe' },
        after: { semanticCacheThreshold: 0.92, mode: 'auto-moe' },
      },
    },
    {
      id: 'aud_01HX9A3',
      timestamp: new Date(now - 3600_000 * 2).toISOString(),
      actor: 'sre.oncall@aegisgateway.internal',
      action: 'CIRCUIT_OVERRIDE',
      targetResource: 'provider_mesh:gemini',
      ipAddress: '10.0.8.21',
      diff: {
        before: { state: 'HALF_OPEN' },
        after: { state: 'CLOSED' },
      },
    }
  );

  return store;
}

/**
 * Returns the global singleton store instance bound to globalThis.
 * Guarantees zero worker/route-bundling state desync across Next.js App Router executions.
 */
export function getGlobalStore(): AegisGlobalStoreState {
  if (!globalThis.__AEGIS_STORE__) {
    const store = createInitialStoreState();
    WalPersistenceAdapter.getInstance().hydrateStore(store);
    globalThis.__AEGIS_STORE__ = store;
  }
  return globalThis.__AEGIS_STORE__;
}

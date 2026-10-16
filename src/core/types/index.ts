export type ModelTier = 'tier-1-fast' | 'tier-2-balanced' | 'tier-3-deep';

export type ProviderType = 'gemini' | 'anthropic' | 'openai' | 'simulator';

export type RoutingMode = 'cost-optimized' | 'latency-critical' | 'quality-max' | 'auto-moe';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type PipelineStage =
  | 'auth.verify_key'
  | 'ratelimit.sliding_window'
  | 'security.guardrails_audit'
  | 'cache.semantic_lookup'
  | 'router.moe_classification'
  | 'circuit_breaker.provider_dispatch'
  | 'response.stream_complete';

export interface GuardrailScanResult {
  passed: boolean;
  blocked: boolean;
  injectionsDetected: string[];
  piiRedacted: Array<{ type: 'email' | 'ssn' | 'credit_card' | 'api_key'; match: string; redacted: string }>;
  sanitizedPrompt: string;
  riskScore: number; // 0.0 to 1.0
  latencyMs: number;
}

export interface PipelineHop {
  stage: PipelineStage;
  durationMs: number;
  status: 'ok' | 'degraded' | 'failed' | 'skipped' | 'cache_hit';
  metadata?: Record<string, unknown>;
}

export interface RequestTrace {
  id: string; // e.g. "tr_01HX9A..."
  timestamp: string;
  tenantId: string;
  apiKeyPrefix: string;
  modelRequested: string;
  modelRouted: string;
  provider: ProviderType;
  routingTier: ModelTier;
  complexityScore: number;
  cacheHit: boolean;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  actualCost: number;
  frontierCostBaseline: number;
  dollarsSaved: number;
  latencyMs: number;
  statusCode: number;
  status: 'succeeded' | 'failed' | 'rate_limited' | 'fallback_routed';
  promptPreview: string;
  promptFull: string;
  responsePreview: string;
  hops: PipelineHop[];
  failoverHistory?: Array<{ provider: string; error: string; durationMs: number }>;
}

export interface ChaosConfig {
  forcedLatencyMs?: number;
  forcedErrorCode?: 429 | 503 | 500;
  active: boolean;
  description?: string;
}

export interface CircuitBreakerState {
  providerId: ProviderType;
  providerName: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  consecutiveSuccesses: number;
  lastFailureTime?: number;
  lastStateChange: number;
  rollingWindowRequests: number;
  rollingWindowFailures: number;
  p95LatencyMs: number;
  recentLatencies: number[];
  chaosOverride?: ChaosConfig;
  adaptiveAnomalyDetection?: {
    ewmaLatencyMs: number;
    latencyVariance: number;
    zScore: number;
    anomalyDetected: boolean;
  };
}

export interface RoutingPolicy {
  tenantId: string;
  mode: RoutingMode;
  semanticCacheThreshold: number; // 0.80 - 0.99 (default: 0.92)
  complexityCutoffTier1: number; // default: 0.35
  complexityCutoffTier2: number; // default: 0.70
  primaryProvider: ProviderType;
  fallbackProvider: ProviderType;
  maxMonthlyBudgetUsd: number;
  currentMonthlySpendUsd: number;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string; // "ag_live_9f8a...3b1c"
  keyHash: string; // SHA-256 of full key
  tenantId: string;
  role: 'admin' | 'gateway_read_write' | 'read_only';
  rateLimitRpm: number;
  rateLimitTpm: number;
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  status: 'active' | 'revoked';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action:
    | 'KEY_CREATED'
    | 'KEY_REVOKED'
    | 'CHAOS_INJECTED'
    | 'CIRCUIT_OVERRIDE'
    | 'POLICY_UPDATED'
    | 'SIMULATOR_TOGGLED';
  targetResource: string;
  ipAddress: string;
  diff: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
}

export interface TelemetrySnapshot {
  timestamp: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHits: number;
  cacheHitRatio: number; // 0.00 - 1.00
  p95LatencyMs: number;
  averageLatencyMs: number;
  totalDollarsSaved: number;
  totalActualCost: number;
  totalTokens: number;
  requestsPerSecond: number;
  circuitStates: Record<ProviderType, CircuitBreakerState>;
  recentTraces: RequestTrace[];
}

export interface GatewayCompletionRequest {
  model?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  routingMode?: RoutingMode;
  tenantId?: string;
  apiKey?: string;
}

export interface GatewayCompletionResponse {
  id: string;
  text: string;
  modelRouted: string;
  provider: ProviderType;
  routingTier: ModelTier;
  complexityScore: number;
  cacheHit: boolean;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finOps: {
    actualCostUsd: number;
    baselineCostUsd: number;
    dollarsSavedUsd: number;
  };
  latencyMs: number;
  traceId: string;
}

import { RequestTrace, ApiKeyRecord, RoutingPolicy, AuditLogEntry } from '../core/types';

export interface TraceFilterParams {
  limit?: number;
  provider?: string;
  tier?: string;
  status?: string;
  cacheHitOnly?: boolean;
  search?: string;
  tenantId?: string;
}

export interface TraceAggregates {
  totalRequests: number;
  cacheHits: number;
  cacheHitRatio: number;
  p95LatencyMs: number;
  averageLatencyMs: number;
  totalDollarsSaved: number;
  totalActualCost: number;
  totalTokens: number;
}

export interface ITraceRepository {
  save(trace: RequestTrace): Promise<RequestTrace>;
  findById(id: string): Promise<RequestTrace | null>;
  findMany(params?: TraceFilterParams): Promise<RequestTrace[]>;
  getAggregates(): Promise<TraceAggregates>;
  count(): Promise<number>;
  clear(): Promise<void>;
}

export interface IApiKeyRepository {
  save(record: ApiKeyRecord): Promise<ApiKeyRecord>;
  findById(id: string): Promise<ApiKeyRecord | null>;
  findByHash(keyHash: string): Promise<ApiKeyRecord | null>;
  findAll(tenantId?: string): Promise<ApiKeyRecord[]>;
  delete(id: string): Promise<boolean>;
}

export interface IPolicyRepository {
  get(tenantId: string): Promise<RoutingPolicy>;
  update(tenantId: string, updates: Partial<Omit<RoutingPolicy, 'tenantId'>>): Promise<RoutingPolicy>;
  addSpend(tenantId: string, amountUsd: number): Promise<void>;
  listAll(): Promise<RoutingPolicy[]>;
}

export interface IAuditLogRepository {
  record(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry>;
  findAll(limit?: number): Promise<AuditLogEntry[]>;
}

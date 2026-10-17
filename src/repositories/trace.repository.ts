import { RequestTrace } from '../core/types';
import { ITraceRepository, TraceFilterParams, TraceAggregates } from './types';
import { getGlobalStore } from '../lib/store';
import { WalPersistenceAdapter } from './wal-adapter';

export class TraceRepository implements ITraceRepository {
  private static instance: TraceRepository;

  public static getInstance(): TraceRepository {
    if (!TraceRepository.instance) {
      TraceRepository.instance = new TraceRepository();
    }
    return TraceRepository.instance;
  }

  public saveSync(trace: RequestTrace): RequestTrace {
    const store = getGlobalStore();
    store.traces.unshift(trace);
    if (store.traces.length > 2000) {
      store.traces.pop();
    }
    WalPersistenceAdapter.getInstance().saveStoreDebounced(store);
    return trace;
  }

  public async save(trace: RequestTrace): Promise<RequestTrace> {
    return this.saveSync(trace);
  }

  public findByIdSync(id: string): RequestTrace | null {
    const store = getGlobalStore();
    const trace = store.traces.find((t) => t.id === id);
    return trace ? { ...trace } : null;
  }

  public async findById(id: string): Promise<RequestTrace | null> {
    return this.findByIdSync(id);
  }

  public findManySync(params?: TraceFilterParams): RequestTrace[] {
    const store = getGlobalStore();
    let result = [...store.traces];

    if (params?.tenantId && params.tenantId !== 'all') {
      result = result.filter((t) => (t.tenantId || 'tenant_enterprise_default') === params.tenantId);
    }
    if (params?.provider && params.provider !== 'all') {
      result = result.filter((t) => t.provider === params.provider);
    }
    if (params?.tier && params.tier !== 'all') {
      result = result.filter((t) => t.routingTier === params.tier);
    }
    if (params?.status && params.status !== 'all') {
      result = result.filter((t) => t.status === params.status);
    }
    if (params?.cacheHitOnly) {
      result = result.filter((t) => t.cacheHit);
    }
    if (params?.search && params.search.trim().length > 0) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.promptFull.toLowerCase().includes(q) ||
          t.modelRouted.toLowerCase().includes(q) ||
          t.provider.toLowerCase().includes(q)
      );
    }

    const limit = params?.limit || 100;
    return result.slice(0, limit);
  }

  public async findMany(params?: TraceFilterParams): Promise<RequestTrace[]> {
    return this.findManySync(params);
  }

  public getAggregatesSync(): TraceAggregates {
    const store = getGlobalStore();
    if (store.traces.length === 0) {
      return {
        totalRequests: 0,
        cacheHits: 0,
        cacheHitRatio: 0,
        p95LatencyMs: 0,
        averageLatencyMs: 0,
        totalDollarsSaved: 0,
        totalActualCost: 0,
        totalTokens: 0,
      };
    }

    let cacheHits = 0;
    let totalLatency = 0;
    let totalDollarsSaved = 0;
    let totalActualCost = 0;
    let totalTokens = 0;
    const latencies: number[] = [];

    for (let i = 0; i < store.traces.length; i++) {
      const t = store.traces[i];
      if (t.cacheHit) cacheHits++;
      totalLatency += t.latencyMs;
      totalDollarsSaved += t.dollarsSaved;
      totalActualCost += t.actualCost;
      totalTokens += t.totalTokens;
      latencies.push(t.latencyMs);
    }

    latencies.sort((a, b) => a - b);
    const p95Index = Math.ceil(0.95 * latencies.length) - 1;
    const p95LatencyMs = latencies[Math.max(0, p95Index)] || 0;

    return {
      totalRequests: store.traces.length,
      cacheHits,
      cacheHitRatio: Number((cacheHits / store.traces.length).toFixed(4)),
      p95LatencyMs: Number(p95LatencyMs.toFixed(1)),
      averageLatencyMs: Number((totalLatency / store.traces.length).toFixed(1)),
      totalDollarsSaved: Number(totalDollarsSaved.toFixed(4)),
      totalActualCost: Number(totalActualCost.toFixed(4)),
      totalTokens,
    };
  }

  public async getAggregates(): Promise<TraceAggregates> {
    return this.getAggregatesSync();
  }

  public async count(): Promise<number> {
    return getGlobalStore().traces.length;
  }

  public async clear(): Promise<void> {
    const store = getGlobalStore();
    store.traces = [];
    WalPersistenceAdapter.getInstance().saveStoreSync(store);
  }
}

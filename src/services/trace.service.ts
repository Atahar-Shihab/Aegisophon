import { RequestTrace } from '../core/types';
import { TraceRepository } from '../repositories/trace.repository';
import { TraceFilterParams, TraceAggregates } from '../repositories/types';

export class TraceService {
  private static instance: TraceService;
  private repository: TraceRepository;

  private constructor() {
    this.repository = TraceRepository.getInstance();
  }

  public static getInstance(): TraceService {
    if (!TraceService.instance) {
      TraceService.instance = new TraceService();
    }
    return TraceService.instance;
  }

  public recordTrace(trace: RequestTrace): void {
    this.repository.saveSync(trace);
  }

  public getTraces(params?: TraceFilterParams): RequestTrace[] {
    return this.repository.findManySync(params);
  }

  public getTraceById(id: string): RequestTrace | undefined {
    const trace = this.repository.findByIdSync(id);
    return trace ?? undefined;
  }

  public getAggregates(): TraceAggregates {
    return this.repository.getAggregatesSync();
  }

  public async getTracesAsync(params?: TraceFilterParams): Promise<RequestTrace[]> {
    return this.repository.findMany(params);
  }

  public async getTraceByIdAsync(id: string): Promise<RequestTrace | null> {
    return this.repository.findById(id);
  }

  public async recordTraceAsync(trace: RequestTrace): Promise<RequestTrace> {
    return this.repository.save(trace);
  }
}

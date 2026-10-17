import { AuditLogEntry } from '../core/types';
import { AuditLogRepository } from '../repositories/audit-log.repository';

export class AuditLogService {
  private static instance: AuditLogService;
  private repository: AuditLogRepository;

  private constructor() {
    this.repository = AuditLogRepository.getInstance();
  }

  public static getInstance(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
    }
    return AuditLogService.instance;
  }

  public record(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    return this.repository.recordSync(entry);
  }

  public getLogs(limit = 100): AuditLogEntry[] {
    return this.repository.findAllSync(limit);
  }

  public async recordAsync(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    return this.repository.record(entry);
  }

  public async getLogsAsync(limit = 100): Promise<AuditLogEntry[]> {
    return this.repository.findAll(limit);
  }
}

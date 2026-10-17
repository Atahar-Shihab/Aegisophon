import { AuditLogEntry } from '../core/types';
import { IAuditLogRepository } from './types';
import { getGlobalStore } from '../lib/store';
import { WalPersistenceAdapter } from './wal-adapter';

export class AuditLogRepository implements IAuditLogRepository {
  private static instance: AuditLogRepository;

  public static getInstance(): AuditLogRepository {
    if (!AuditLogRepository.instance) {
      AuditLogRepository.instance = new AuditLogRepository();
    }
    return AuditLogRepository.instance;
  }

  public recordSync(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const store = getGlobalStore();
    const fullEntry: AuditLogEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };

    store.auditLogs.unshift(fullEntry);
    if (store.auditLogs.length > 500) {
      store.auditLogs.pop();
    }

    WalPersistenceAdapter.getInstance().saveStoreDebounced(store);
    return fullEntry;
  }

  public async record(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    return this.recordSync(entry);
  }

  public findAllSync(limit = 100): AuditLogEntry[] {
    const store = getGlobalStore();
    return store.auditLogs.slice(0, limit).map((l) => ({ ...l }));
  }

  public async findAll(limit = 100): Promise<AuditLogEntry[]> {
    return this.findAllSync(limit);
  }
}

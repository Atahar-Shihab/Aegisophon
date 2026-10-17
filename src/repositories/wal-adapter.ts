import fs from 'fs';
import path from 'path';
import { AegisGlobalStoreState } from '../lib/store';
import { ApiKeyRecord, RoutingPolicy } from '../core/types';

const DATA_DIR = path.join(process.cwd(), '.aegis_data');
const WAL_FILE = path.join(DATA_DIR, 'store_wal.json');

interface SerializedStore {
  traces: AegisGlobalStoreState['traces'];
  apiKeys: [string, ApiKeyRecord][];
  hashToKeyId: [string, string][];
  policies: [string, RoutingPolicy][];
  auditLogs: AegisGlobalStoreState['auditLogs'];
  savedAt: string;
}

export class WalPersistenceAdapter {
  private static instance: WalPersistenceAdapter;
  private debounceTimer: NodeJS.Timeout | null = null;
  private isWriting = false;

  public static getInstance(): WalPersistenceAdapter {
    if (!WalPersistenceAdapter.instance) {
      WalPersistenceAdapter.instance = new WalPersistenceAdapter();
    }
    return WalPersistenceAdapter.instance;
  }

  private ensureDir(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch {
      // ignore
    }
  }

  public hydrateStore(store: AegisGlobalStoreState): void {
    try {
      this.ensureDir();
      if (!fs.existsSync(WAL_FILE)) return;

      const raw = fs.readFileSync(WAL_FILE, 'utf-8');
      const data: SerializedStore = JSON.parse(raw);

      if (Array.isArray(data.traces) && data.traces.length > 0) {
        store.traces = data.traces;
      }
      if (Array.isArray(data.apiKeys) && data.apiKeys.length > 0) {
        store.apiKeys = new Map(data.apiKeys);
      }
      if (Array.isArray(data.hashToKeyId) && data.hashToKeyId.length > 0) {
        store.hashToKeyId = new Map(data.hashToKeyId);
      }
      if (Array.isArray(data.policies) && data.policies.length > 0) {
        store.policies = new Map(data.policies);
      }
      if (Array.isArray(data.auditLogs) && data.auditLogs.length > 0) {
        store.auditLogs = data.auditLogs;
      }
    } catch {
      // Fallback cleanly to in-memory state if file cannot be read
    }
  }

  public saveStoreDebounced(store: AegisGlobalStoreState, delayMs = 1500): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.saveStoreSync(store);
    }, delayMs);
  }

  public saveStoreSync(store: AegisGlobalStoreState): void {
    if (this.isWriting) return;
    this.isWriting = true;
    try {
      this.ensureDir();
      const serialized: SerializedStore = {
        traces: store.traces.slice(0, 500), // retain latest 500 traces
        apiKeys: Array.from(store.apiKeys.entries()),
        hashToKeyId: Array.from(store.hashToKeyId.entries()),
        policies: Array.from(store.policies.entries()),
        auditLogs: store.auditLogs.slice(0, 200),
        savedAt: new Date().toISOString(),
      };

      const tmpFile = `${WAL_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(serialized, null, 2), 'utf-8');
      fs.renameSync(tmpFile, WAL_FILE);
    } catch {
      // Non-fatal WAL write failure
    } finally {
      this.isWriting = false;
    }
  }
}

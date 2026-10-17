import { ApiKeyRecord } from '../core/types';
import { IApiKeyRepository } from './types';
import { getGlobalStore } from '../lib/store';
import { WalPersistenceAdapter } from './wal-adapter';

export class ApiKeyRepository implements IApiKeyRepository {
  private static instance: ApiKeyRepository;

  public static getInstance(): ApiKeyRepository {
    if (!ApiKeyRepository.instance) {
      ApiKeyRepository.instance = new ApiKeyRepository();
    }
    return ApiKeyRepository.instance;
  }

  public saveSync(record: ApiKeyRecord): ApiKeyRecord {
    const store = getGlobalStore();
    store.apiKeys.set(record.id, { ...record });
    store.hashToKeyId.set(record.keyHash, record.id);
    WalPersistenceAdapter.getInstance().saveStoreDebounced(store);
    return { ...record };
  }

  public async save(record: ApiKeyRecord): Promise<ApiKeyRecord> {
    return this.saveSync(record);
  }

  public findByIdSync(id: string): ApiKeyRecord | null {
    const store = getGlobalStore();
    const record = store.apiKeys.get(id);
    return record ? { ...record } : null;
  }

  public async findById(id: string): Promise<ApiKeyRecord | null> {
    return this.findByIdSync(id);
  }

  public findByHashSync(keyHash: string): ApiKeyRecord | null {
    const store = getGlobalStore();
    const id = store.hashToKeyId.get(keyHash);
    if (!id) return null;
    const record = store.apiKeys.get(id);
    return record ? { ...record } : null;
  }

  public async findByHash(keyHash: string): Promise<ApiKeyRecord | null> {
    return this.findByHashSync(keyHash);
  }

  public findAllSync(tenantId?: string): ApiKeyRecord[] {
    const store = getGlobalStore();
    const all = Array.from(store.apiKeys.values());
    if (!tenantId || tenantId === 'all') {
      return all.map((r) => ({ ...r }));
    }
    return all.filter((r) => r.tenantId === tenantId).map((r) => ({ ...r }));
  }

  public async findAll(tenantId?: string): Promise<ApiKeyRecord[]> {
    return this.findAllSync(tenantId);
  }

  public deleteSync(id: string): boolean {
    const store = getGlobalStore();
    const record = store.apiKeys.get(id);
    if (!record) return false;

    store.apiKeys.delete(id);
    store.hashToKeyId.delete(record.keyHash);
    WalPersistenceAdapter.getInstance().saveStoreSync(store);
    return true;
  }

  public async delete(id: string): Promise<boolean> {
    return this.deleteSync(id);
  }
}

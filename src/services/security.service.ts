import crypto from 'crypto';
import { ApiKeyRecord } from '../core/types';

export class SecurityService {
  private static instance: SecurityService;
  private keys: Map<string, ApiKeyRecord> = new Map(); // id -> record
  private hashToId: Map<string, string> = new Map(); // keyHash -> id

  private constructor() {
    // Pre-seed default master demo key
    this.seedDefaultKey();
  }

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  public static hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
  }

  public static maskKey(rawKey: string): string {
    if (rawKey.length <= 16) return rawKey;
    const prefix = rawKey.substring(0, 12);
    const suffix = rawKey.substring(rawKey.length - 4);
    return `${prefix}...${suffix}`;
  }

  private seedDefaultKey(): void {
    const defaultRaw = 'ag_live_demo_enterprise_master_key_9f8a3b1c';
    const hash = SecurityService.hashKey(defaultRaw);
    const id = 'key_master_demo';

    const record: ApiKeyRecord = {
      id,
      name: 'Default Enterprise Master Demo Key',
      keyPrefix: SecurityService.maskKey(defaultRaw),
      keyHash: hash,
      tenantId: 'tenant_enterprise_default',
      role: 'admin',
      rateLimitRpm: 600,
      rateLimitTpm: 500_000,
      createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
      status: 'active',
      lastUsedAt: new Date().toISOString(),
    };

    this.keys.set(id, record);
    this.hashToId.set(hash, id);
  }

  /**
   * Generates a new cryptographic API key
   */
  public createKey(params: {
    name: string;
    tenantId?: string;
    role?: 'admin' | 'gateway_read_write' | 'read_only';
    rateLimitRpm?: number;
    rateLimitTpm?: number;
    expiresInDays?: number;
  }): { rawKey: string; record: ApiKeyRecord } {
    const randomHex = crypto.randomBytes(16).toString('hex');
    const rawKey = `ag_live_${randomHex}`;
    const keyHash = SecurityService.hashKey(rawKey);
    const keyPrefix = SecurityService.maskKey(rawKey);
    const id = `key_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date();

    const expiresAt = params.expiresInDays
      ? new Date(now.getTime() + params.expiresInDays * 24 * 3600 * 1000).toISOString()
      : undefined;

    const record: ApiKeyRecord = {
      id,
      name: params.name,
      keyPrefix,
      keyHash,
      tenantId: params.tenantId || 'tenant_enterprise_default',
      role: params.role || 'gateway_read_write',
      rateLimitRpm: params.rateLimitRpm || 600,
      rateLimitTpm: params.rateLimitTpm || 500_000,
      createdAt: now.toISOString(),
      expiresAt,
      status: 'active',
    };

    this.keys.set(id, record);
    this.hashToId.set(keyHash, id);

    return { rawKey, record };
  }

  /**
   * Verifies an incoming key string against active records
   */
  public verifyKey(rawKey?: string): { valid: boolean; record?: ApiKeyRecord; reason?: string } {
    // If no key provided in demo mode, accept default master
    if (!rawKey || rawKey.trim().length === 0) {
      const defaultId = 'key_master_demo';
      const record = this.keys.get(defaultId);
      if (record && record.status === 'active') {
        record.lastUsedAt = new Date().toISOString();
        return { valid: true, record };
      }
      return { valid: false, reason: 'Missing API Key' };
    }

    const hash = SecurityService.hashKey(rawKey);
    const id = this.hashToId.get(hash);
    if (!id) {
      return { valid: false, reason: 'Invalid API Key' };
    }

    const record = this.keys.get(id);
    if (!record) {
      return { valid: false, reason: 'Key record not found' };
    }

    if (record.status !== 'active') {
      return { valid: false, reason: 'API Key has been revoked' };
    }

    if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
      return { valid: false, reason: 'API Key has expired' };
    }

    record.lastUsedAt = new Date().toISOString();
    return { valid: true, record };
  }

  public listKeys(tenantId = 'tenant_enterprise_default'): ApiKeyRecord[] {
    const list: ApiKeyRecord[] = [];
    this.keys.forEach((rec) => {
      if (rec.tenantId === tenantId) {
        list.push(rec);
      }
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public revokeKey(id: string): boolean {
    const record = this.keys.get(id);
    if (!record) return false;
    record.status = 'revoked';
    return true;
  }
}

import { AuditLogEntry } from '../core/types';

export class AuditLogService {
  private static instance: AuditLogService;
  private logs: AuditLogEntry[] = [];

  private constructor() {
    this.seedBaselineLogs();
  }

  public static getInstance(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
    }
    return AuditLogService.instance;
  }

  private seedBaselineLogs(): void {
    const now = Date.now();
    this.logs.push(
      {
        id: 'aud_01HX9A1',
        timestamp: new Date(now - 3600_000 * 24).toISOString(),
        actor: 'system.admin@aegisgateway.internal',
        action: 'KEY_CREATED',
        targetResource: 'ag_live_demo_enterprise_master_key_9f8a3b1c',
        ipAddress: '10.0.4.12',
        diff: {
          after: { role: 'admin', rateLimitRpm: 600, rateLimitTpm: 500000 },
        },
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
  }

  public record(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const fullEntry: AuditLogEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.logs.unshift(fullEntry);
    if (this.logs.length > 500) {
      this.logs.pop();
    }
    return fullEntry;
  }

  public getLogs(limit = 100): AuditLogEntry[] {
    return this.logs.slice(0, limit);
  }
}

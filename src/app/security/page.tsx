'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { KeyGeneratorModal } from '@/components/security/KeyGeneratorModal';
import { ApiKeyRecord, AuditLogEntry } from '@/core/types';
import {
  ShieldCheck,
  Key,
  Plus,
  Trash2,
  Clock,
  Layers,
  FileText,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SecurityPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/v1/keys');
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch {
      // ignore
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/v1/audit');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchKeys();
    fetchAuditLogs();
  }, []);

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action is permanent and immediate.')) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/keys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchKeys();
        fetchAuditLogs();
      }
    } catch {
      // ignore
    }
  };

  const copyPrefix = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getActionBadge = (action: AuditLogEntry['action']) => {
    switch (action) {
      case 'KEY_CREATED':
        return 'text-accent-indigo bg-accent-indigo/15 border-accent-indigo/30';
      case 'KEY_REVOKED':
        return 'text-accent-rose bg-accent-rose/15 border-accent-rose/30';
      case 'CHAOS_INJECTED':
        return 'text-accent-amber bg-accent-amber/15 border-accent-amber/30';
      case 'CIRCUIT_OVERRIDE':
        return 'text-accent-emerald bg-accent-emerald/15 border-accent-emerald/30';
      case 'POLICY_UPDATED':
      default:
        return 'text-accent-purple bg-accent-purple/15 border-accent-purple/30';
    }
  };

  return (
    <AppShell title="Security Vault & Audit Trail">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* API Key Vault Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Key className="w-5 h-5 text-accent-indigo" />
                Cryptographic API Key Vault
              </h2>
              <p className="text-xs text-obsidian-text-muted mt-0.5">
                Keys use <span className="font-mono text-white">ag_live_...</span> format with SHA-256 one-way hashing. Raw keys are never stored.
              </p>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-accent-indigo hover:bg-accent-indigo-dark text-white text-xs font-mono font-medium shadow-glow-indigo transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Generate API Key</span>
            </button>
          </div>

          <div className="bg-obsidian-surface border border-obsidian-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-obsidian-border bg-obsidian-card/50 text-obsidian-text-muted text-[11px]">
                    <th className="py-3 px-4 font-medium">Name</th>
                    <th className="py-3 px-4 font-medium">Key Prefix</th>
                    <th className="py-3 px-4 font-medium">Role</th>
                    <th className="py-3 px-4 font-medium">RPM Limit</th>
                    <th className="py-3 px-4 font-medium">TPM Limit</th>
                    <th className="py-3 px-4 font-medium">Created</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-obsidian-border/40 text-obsidian-text-secondary">
                  {keys.map((k) => (
                    <tr key={k.id} className="hover:bg-obsidian-hover/50 transition-colors">
                      <td className="py-3 px-4 text-white font-medium">{k.name}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-obsidian-text-secondary">{k.keyPrefix}</span>
                          <button
                            onClick={() => copyPrefix(k.id, k.keyPrefix)}
                            className="p-1 hover:text-white transition-colors"
                            title="Copy Masked Prefix"
                          >
                            {copiedId === k.id ? (
                              <Check className="w-3 h-3 text-accent-emerald" />
                            ) : (
                              <Copy className="w-3 h-3 text-obsidian-text-muted" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-obsidian-card border border-obsidian-border">
                          {k.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white">{k.rateLimitRpm} rpm</td>
                      <td className="py-3 px-4 text-white">{k.rateLimitTpm.toLocaleString()} tpm</td>
                      <td className="py-3 px-4 text-obsidian-text-muted">
                        {new Date(k.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'text-[10px] font-mono px-2 py-0.5 rounded-full border',
                            k.status === 'active'
                              ? 'text-accent-emerald bg-accent-emerald/15 border-accent-emerald/30'
                              : 'text-accent-rose bg-accent-rose/15 border-accent-rose/30'
                          )}
                        >
                          {k.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {k.status === 'active' && k.id !== 'key_master_demo' && (
                          <button
                            onClick={() => handleRevokeKey(k.id)}
                            className="text-accent-rose hover:text-rose-400 p-1.5 rounded hover:bg-obsidian-card transition-colors"
                            title="Revoke Key"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Immutable Security Audit Trail Section */}
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-accent-emerald" />
              Immutable Security Audit Trail
            </h2>
            <p className="text-xs text-obsidian-text-muted mt-0.5">
              Append-only audit ledger recording all key lifecycle events, chaos injections, and policy modifications
            </p>
          </div>

          <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-5 space-y-3">
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-obsidian-card border border-obsidian-border text-xs font-mono space-y-2 hover:border-obsidian-border-active transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded border', getActionBadge(log.action))}>
                        {log.action}
                      </span>
                      <span className="text-white font-medium">{log.targetResource}</span>
                    </div>

                    <div className="flex items-center gap-3 text-obsidian-text-muted text-[11px]">
                      <span>{log.actor}</span>
                      <span>•</span>
                      <span>IP: {log.ipAddress}</span>
                      <span>•</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {log.diff && (
                    <div className="pt-2 border-t border-obsidian-border/50 text-[11px]">
                      <span className="text-obsidian-text-muted text-[10px] uppercase">State Mutation Diff</span>
                      <pre className="mt-1 p-2 rounded bg-obsidian-bg text-obsidian-text-secondary overflow-x-auto">
                        {JSON.stringify(log.diff, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Key Generator Modal */}
        <KeyGeneratorModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onKeyCreated={() => {
            fetchKeys();
            fetchAuditLogs();
          }}
        />
      </div>
    </AppShell>
  );
}

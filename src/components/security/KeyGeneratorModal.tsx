'use client';

import React, { useState } from 'react';
import {
  X,
  Key,
  Copy,
  Check,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiKeyRecord } from '@/core/types';

interface KeyGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyCreated: () => void;
}

export function KeyGeneratorModal({ isOpen, onClose, onKeyCreated }: KeyGeneratorModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'gateway_read_write' | 'admin' | 'read_only'>('gateway_read_write');
  const [rateLimitRpm, setRateLimitRpm] = useState(600);
  const [rateLimitTpm, setRateLimitTpm] = useState(500000);
  const [expiresInDays, setExpiresInDays] = useState(90);

  const [loading, setLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          role,
          rateLimitRpm: Number(rateLimitRpm),
          rateLimitTpm: Number(rateLimitTpm),
          expiresInDays: Number(expiresInDays),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedKey(data.rawKey);
        onKeyCreated();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setGeneratedKey(null);
    setName('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg bg-obsidian-surface border border-obsidian-border rounded-xl shadow-obsidian-card overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-obsidian-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-indigo/15 border border-accent-indigo/30 flex items-center justify-center text-accent-indigo">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Generate Cryptographic API Key</h3>
              <p className="text-[11px] text-obsidian-text-muted">
                SHA-256 hashed secret with granular RPM/TPM quota controls
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-obsidian-text-muted hover:text-white hover:bg-obsidian-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 2: Key Reveal Screen */}
        {generatedKey ? (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-xl bg-accent-amber/10 border border-accent-amber/30 text-xs font-mono text-accent-amber space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>Save Your Secret Key Now</span>
              </div>
              <p className="text-[11px] text-obsidian-text-secondary">
                For security reasons, only the SHA-256 hash is retained in the database. This raw secret will never be shown again.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-obsidian-text-muted uppercase">
                Raw Cryptographic Secret Key
              </label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-obsidian-card border border-obsidian-border font-mono text-xs text-accent-indigo select-all break-all">
                <span className="flex-1">{generatedKey}</span>
                <button
                  onClick={copySecret}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent-indigo text-white font-medium hover:bg-accent-indigo-dark transition-all text-xs flex-shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-2.5 rounded-lg bg-obsidian-card hover:bg-obsidian-hover border border-obsidian-border text-white text-xs font-mono font-medium transition-colors"
            >
              I have safely copied my key
            </button>
          </div>
        ) : (
          /* Step 1: Key Configuration Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-mono">
            <div>
              <label className="text-obsidian-text-secondary block mb-1.5">Key Name / Description</label>
              <input
                required
                type="text"
                placeholder="e.g. Production Data Ingestion Worker"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-obsidian-card border border-obsidian-border rounded-lg px-3 py-2 text-white placeholder:text-obsidian-text-muted focus:outline-none focus:border-obsidian-border-active text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-obsidian-text-secondary block mb-1.5">Role & Scope</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-obsidian-card border border-obsidian-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-obsidian-border-active text-xs"
                >
                  <option value="gateway_read_write">Read / Write Gateway</option>
                  <option value="read_only">Read-Only Telemetry</option>
                  <option value="admin">Tenant Administrator</option>
                </select>
              </div>

              <div>
                <label className="text-obsidian-text-secondary block mb-1.5">Expiration</label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  className="w-full bg-obsidian-card border border-obsidian-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-obsidian-border-active text-xs"
                >
                  <option value={30}>30 Days</option>
                  <option value={90}>90 Days</option>
                  <option value={365}>1 Year</option>
                  <option value={0}>No Expiration</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-obsidian-text-secondary block mb-1.5">RPM Rate Limit</label>
                <input
                  type="number"
                  min={10}
                  max={10000}
                  value={rateLimitRpm}
                  onChange={(e) => setRateLimitRpm(Number(e.target.value))}
                  className="w-full bg-obsidian-card border border-obsidian-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-obsidian-border-active text-xs"
                />
              </div>

              <div>
                <label className="text-obsidian-text-secondary block mb-1.5">TPM Token Limit</label>
                <input
                  type="number"
                  min={1000}
                  max={5000000}
                  step={50000}
                  value={rateLimitTpm}
                  onChange={(e) => setRateLimitTpm(Number(e.target.value))}
                  className="w-full bg-obsidian-card border border-obsidian-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-obsidian-border-active text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-obsidian-border flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg bg-obsidian-card hover:bg-obsidian-hover border border-obsidian-border text-obsidian-text-secondary hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="px-4 py-2 rounded-lg bg-accent-indigo hover:bg-accent-indigo-dark text-white font-medium transition-all shadow-glow-indigo"
              >
                {loading ? 'Issuing Key...' : 'Create Scoped Key'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { CircuitBreakerState, ProviderType } from '@/core/types';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Clock,
  RotateCcw,
  AlertTriangle,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProviderMeshGridProps {
  circuits: Record<ProviderType, CircuitBreakerState>;
  onRefresh?: () => void;
}

export function ProviderMeshGrid({ circuits, onRefresh }: ProviderMeshGridProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleChaos = async (provider: ProviderType, type: string) => {
    const actionKey = `${provider}-${type}`;
    setLoadingAction(actionKey);
    try {
      await fetch('/api/v1/chaos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, type }),
      });
      if (onRefresh) onRefresh();
    } catch {
      // ignore
    } finally {
      setLoadingAction(null);
    }
  };

  const providers: ProviderType[] = ['gemini', 'anthropic', 'openai', 'simulator'];

  const providerLabels: Record<ProviderType, { name: string; subtitle: string; iconBg: string }> = {
    gemini: {
      name: 'Google Gemini Mesh',
      subtitle: 'Primary Tier 1/2 (Flash / Pro)',
      iconBg: 'from-blue-600 to-indigo-600',
    },
    anthropic: {
      name: 'Anthropic Claude Mesh',
      subtitle: 'Secondary Tier 2/3 (Sonnet / Opus)',
      iconBg: 'from-amber-600 to-orange-600',
    },
    openai: {
      name: 'OpenAI Fabric',
      subtitle: 'Tier 2/3 (GPT-4o / o1)',
      iconBg: 'from-emerald-600 to-teal-600',
    },
    simulator: {
      name: 'Deterministic Simulator',
      subtitle: 'Zero-Cost Local Streaming & Chaos',
      iconBg: 'from-purple-600 to-indigo-600',
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {providers.map((key) => {
        const meta = providerLabels[key];
        const cb = circuits[key] || {
          providerId: key,
          providerName: meta.name,
          state: 'CLOSED',
          failureCount: 0,
          successCount: 0,
          consecutiveSuccesses: 0,
          rollingWindowRequests: 0,
          rollingWindowFailures: 0,
          p95LatencyMs: 0,
          recentLatencies: [],
        };

        const isClosed = cb.state === 'CLOSED';
        const isHalfOpen = cb.state === 'HALF_OPEN';
        const isOpen = cb.state === 'OPEN';

        const stateColor = isClosed
          ? 'text-accent-emerald bg-accent-emerald/15 border-accent-emerald/30'
          : isHalfOpen
          ? 'text-accent-amber bg-accent-amber/15 border-accent-amber/30 animate-pulse'
          : 'text-accent-rose bg-accent-rose/15 border-accent-rose/30 animate-pulse';

        const stateIcon = isClosed ? (
          <ShieldCheck className="w-3.5 h-3.5 text-accent-emerald" />
        ) : isHalfOpen ? (
          <AlertTriangle className="w-3.5 h-3.5 text-accent-amber" />
        ) : (
          <ShieldAlert className="w-3.5 h-3.5 text-accent-rose" />
        );

        const totalReqs = cb.rollingWindowRequests || (cb.successCount + cb.failureCount) || 1;
        const successRate = Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((totalReqs - (cb.rollingWindowFailures || cb.failureCount)) / totalReqs) * 100
            )
          )
        );

        return (
          <div
            key={key}
            className={cn(
              'bg-obsidian-surface border rounded-xl p-4 transition-all relative overflow-hidden',
              isOpen
                ? 'border-accent-rose/40 shadow-glow-rose'
                : isHalfOpen
                ? 'border-accent-amber/40 shadow-glow-amber'
                : 'border-obsidian-border hover:border-obsidian-border-active'
            )}
          >
            {/* Header: Provider & State Badge */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-xs text-white">{meta.name}</h3>
                <p className="text-[10px] text-obsidian-text-muted">{meta.subtitle}</p>
              </div>
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono font-medium',
                  stateColor
                )}
              >
                {stateIcon}
                <span>{cb.state}</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-lg bg-obsidian-card border border-obsidian-border text-[11px] font-mono">
              <div>
                <div className="text-[10px] text-obsidian-text-muted">Health SLA</div>
                <div className={cn('font-bold', successRate > 80 ? 'text-accent-emerald' : 'text-accent-rose')}>
                  {successRate}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-obsidian-text-muted">P95 Latency</div>
                <div className="font-bold text-white">{cb.p95LatencyMs || 120}ms</div>
              </div>
              <div>
                <div className="text-[10px] text-obsidian-text-muted">Window Failures</div>
                <div className={cn('font-bold', cb.rollingWindowFailures > 0 ? 'text-accent-rose' : 'text-white')}>
                  {cb.rollingWindowFailures} / {cb.rollingWindowRequests || 20}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-obsidian-text-muted">Canary Probes</div>
                <div className="font-bold text-accent-indigo">
                  {cb.consecutiveSuccesses} / 3
                </div>
              </div>
            </div>

            {/* Chaos Injection Actions */}
            <div className="pt-2 border-t border-obsidian-border">
              <div className="text-[10px] uppercase font-mono text-obsidian-text-muted mb-1.5 flex items-center justify-between">
                <span>Chaos Controls</span>
                {cb.chaosOverride?.active && (
                  <span className="text-accent-rose font-medium animate-pulse">Fault Active</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                <button
                  onClick={() => handleChaos(key, 'rate_limit_429')}
                  disabled={loadingAction === `${key}-rate_limit_429`}
                  className="px-2 py-1 rounded bg-obsidian-hover hover:bg-obsidian-hover/80 border border-obsidian-border hover:border-accent-rose/50 text-obsidian-text-secondary hover:text-white transition-all flex items-center justify-center gap-1"
                  title="Inject simulated HTTP 429 Rate Limit"
                >
                  <Zap className="w-2.5 h-2.5 text-accent-rose" />
                  <span>429 Limit</span>
                </button>

                <button
                  onClick={() => handleChaos(key, 'outage_503')}
                  disabled={loadingAction === `${key}-outage_503`}
                  className="px-2 py-1 rounded bg-obsidian-hover hover:bg-obsidian-hover/80 border border-obsidian-border hover:border-accent-rose/50 text-obsidian-text-secondary hover:text-white transition-all flex items-center justify-center gap-1"
                  title="Inject simulated HTTP 503 Outage"
                >
                  <Flame className="w-2.5 h-2.5 text-accent-rose" />
                  <span>503 Outage</span>
                </button>

                <button
                  onClick={() => handleChaos(key, 'latency_spike')}
                  disabled={loadingAction === `${key}-latency_spike`}
                  className="px-2 py-1 rounded bg-obsidian-hover hover:bg-obsidian-hover/80 border border-obsidian-border hover:border-accent-amber/50 text-obsidian-text-secondary hover:text-white transition-all flex items-center justify-center gap-1"
                  title="Inject simulated 3500ms latency spike"
                >
                  <Clock className="w-2.5 h-2.5 text-accent-amber" />
                  <span>3.5s Spike</span>
                </button>

                <button
                  onClick={() => handleChaos(key, 'reset')}
                  disabled={loadingAction === `${key}-reset`}
                  className="px-2 py-1 rounded bg-obsidian-hover hover:bg-obsidian-hover/80 border border-obsidian-border hover:border-accent-emerald/50 text-obsidian-text-secondary hover:text-white transition-all flex items-center justify-center gap-1"
                  title="Reset circuit breaker to CLOSED"
                >
                  <RotateCcw className="w-2.5 h-2.5 text-accent-emerald" />
                  <span>Reset CB</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

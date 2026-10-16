'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { RoutingPolicy, RoutingMode, ProviderType } from '@/core/types';
import {
  Sliders,
  Save,
  CheckCircle2,
  Coins,
  ShieldCheck,
  Zap,
  TrendingDown,
  Layers,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

export default function PoliciesPage() {
  const [policy, setPolicy] = useState<RoutingPolicy | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [mode, setMode] = useState<RoutingMode>('auto-moe');
  const [semanticCacheThreshold, setSemanticCacheThreshold] = useState(0.92);
  const [complexityCutoffTier1, setComplexityCutoffTier1] = useState(0.35);
  const [complexityCutoffTier2, setComplexityCutoffTier2] = useState(0.70);
  const [primaryProvider, setPrimaryProvider] = useState<ProviderType>('gemini');
  const [fallbackProvider, setFallbackProvider] = useState<ProviderType>('anthropic');
  const [maxMonthlyBudgetUsd, setMaxMonthlyBudgetUsd] = useState(5000);

  const fetchPolicy = async () => {
    try {
      const res = await fetch('/api/v1/policies');
      if (res.ok) {
        const data: RoutingPolicy = await res.json();
        setPolicy(data);
        setMode(data.mode);
        setSemanticCacheThreshold(data.semanticCacheThreshold);
        setComplexityCutoffTier1(data.complexityCutoffTier1);
        setComplexityCutoffTier2(data.complexityCutoffTier2);
        setPrimaryProvider(data.primaryProvider);
        setFallbackProvider(data.fallbackProvider);
        setMaxMonthlyBudgetUsd(data.maxMonthlyBudgetUsd);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/v1/policies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          semanticCacheThreshold: Number(semanticCacheThreshold),
          complexityCutoffTier1: Number(complexityCutoffTier1),
          complexityCutoffTier2: Number(complexityCutoffTier2),
          primaryProvider,
          fallbackProvider,
          maxMonthlyBudgetUsd: Number(maxMonthlyBudgetUsd),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPolicy(data);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const spendPercentage = policy
    ? Math.min(100, Math.round((policy.currentMonthlySpendUsd / (policy.maxMonthlyBudgetUsd || 1)) * 100))
    : 8;

  return (
    <AppShell title="FinOps Cost Governance & Routing Policies">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Sliders className="w-5 h-5 text-accent-indigo" />
              Routing Policy & Cost Governance Controls
            </h2>
            <p className="text-xs text-obsidian-text-muted mt-0.5">
              Tune Semantic Cache cosine similarity cutoffs, MoE complexity tier thresholds, and budget quotas
            </p>
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30 text-xs font-mono animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Policy Updated & Recorded in Audit</span>
            </div>
          )}
        </div>

        {/* Budget Utilization Meter */}
        <section className="bg-obsidian-surface border border-obsidian-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-accent-emerald" />
              <span className="text-xs font-semibold text-white">Monthly FinOps Token Budget Utilization</span>
            </div>
            <div className="font-mono text-xs text-obsidian-text-secondary">
              <span className="text-white font-bold">{formatCurrency(policy?.currentMonthlySpendUsd || 418.95)}</span>{' '}
              / {formatCurrency(maxMonthlyBudgetUsd)} ({spendPercentage}%)
            </div>
          </div>

          <div className="h-2.5 w-full bg-obsidian-card rounded-full overflow-hidden border border-obsidian-border">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                spendPercentage > 85 ? 'bg-accent-rose' : 'bg-accent-emerald'
              )}
              style={{ width: `${Math.max(2, spendPercentage)}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] font-mono text-obsidian-text-muted">
            <span>$0.00 Minimum Baseline</span>
            <span>Alert Threshold (85%): {formatCurrency(maxMonthlyBudgetUsd * 0.85)}</span>
            <span>Hard Cap: {formatCurrency(maxMonthlyBudgetUsd)}</span>
          </div>
        </section>

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Routing Modes */}
          <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              1. Global Tenant Routing Strategy
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  id: 'auto-moe',
                  label: 'Auto-MoE',
                  desc: 'Classifies prompts & dynamically selects Tier 1, 2, or 3 based on complexity scoring.',
                  badge: 'Recommended',
                },
                {
                  id: 'cost-optimized',
                  label: 'Cost-Optimized',
                  desc: 'Aggressively down-routes all non-complex queries to Tier 1 fast models (up to 70% savings).',
                },
                {
                  id: 'latency-critical',
                  label: 'Latency-Critical',
                  desc: 'Prioritizes lowest TTFT (<100ms) with lightweight streaming edge models.',
                },
                {
                  id: 'quality-max',
                  label: 'Quality-Max',
                  desc: 'Directs all incoming queries to flagship frontier reasoning models (Tier 3).',
                },
              ].map((m) => (
                <div
                  key={m.id}
                  onClick={() => setMode(m.id as RoutingMode)}
                  className={cn(
                    'p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between',
                    mode === m.id
                      ? 'bg-accent-indigo/10 border-accent-indigo shadow-glow-indigo text-white'
                      : 'bg-obsidian-card border-obsidian-border hover:border-obsidian-border-active text-obsidian-text-secondary'
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-xs font-mono text-white">{m.label}</span>
                      {m.badge && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-accent-indigo/20 text-accent-indigo border border-accent-indigo/30">
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-obsidian-text-muted">{m.desc}</p>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        mode === m.id ? 'bg-accent-indigo' : 'bg-obsidian-border'
                      )}
                    />
                    <span>{mode === m.id ? 'Active Mode' : 'Select'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Semantic Cache & Complexity Threshold Sliders */}
          <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-5 space-y-6">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              2. Algorithmic Threshold Tuning
            </h3>

            {/* Semantic Cache Similarity Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between font-mono text-xs">
                <div>
                  <span className="text-white font-medium">Semantic Vector Cache Threshold ($\tau$)</span>
                  <p className="text-[11px] text-obsidian-text-muted">
                    Cosine similarity score required to serve a 0ms, $0.00 cache hit.
                  </p>
                </div>
                <span className="text-sm font-bold text-accent-emerald bg-accent-emerald/10 px-2.5 py-1 rounded border border-accent-emerald/30">
                  {semanticCacheThreshold.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.80"
                max="0.99"
                step="0.01"
                value={semanticCacheThreshold}
                onChange={(e) => setSemanticCacheThreshold(parseFloat(e.target.value))}
                className="w-full accent-accent-emerald h-1.5 bg-obsidian-card rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-obsidian-text-muted">
                <span>0.80 (Aggressive Caching)</span>
                <span>0.92 (Optimal Default)</span>
                <span>0.99 (Near-Exact Match)</span>
              </div>
            </div>

            {/* Complexity Cutoffs Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-obsidian-border">
              {/* Tier 1 Cutoff */}
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-white">Tier 1 Fast Cutoff</span>
                  <span className="text-accent-indigo font-bold">{complexityCutoffTier1.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.50"
                  step="0.01"
                  value={complexityCutoffTier1}
                  onChange={(e) => setComplexityCutoffTier1(parseFloat(e.target.value))}
                  className="w-full accent-accent-indigo h-1.5 bg-obsidian-card rounded-lg cursor-pointer"
                />
                <p className="text-[10px] text-obsidian-text-muted">
                  Prompts scoring &lt; {complexityCutoffTier1.toFixed(2)} route to Gemini Flash / Claude Haiku.
                </p>
              </div>

              {/* Tier 2 Cutoff */}
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-white">Tier 2 Balanced Cutoff</span>
                  <span className="text-accent-purple font-bold">{complexityCutoffTier2.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.50"
                  max="0.85"
                  step="0.01"
                  value={complexityCutoffTier2}
                  onChange={(e) => setComplexityCutoffTier2(parseFloat(e.target.value))}
                  className="w-full accent-accent-purple h-1.5 bg-obsidian-card rounded-lg cursor-pointer"
                />
                <p className="text-[10px] text-obsidian-text-muted">
                  Prompts scoring &gt;= {complexityCutoffTier2.toFixed(2)} escalate to Tier 3 Deep Reasoning.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Mesh Routing Priorities & Hard Caps */}
          <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              3. Upstream Provider Mesh & Budget Limits
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <label className="text-obsidian-text-secondary block mb-1.5">Primary Provider</label>
                <select
                  value={primaryProvider}
                  onChange={(e) => setPrimaryProvider(e.target.value as ProviderType)}
                  className="w-full bg-obsidian-card border border-obsidian-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-obsidian-border-active text-xs"
                >
                  <option value="gemini">Google Gemini Mesh</option>
                  <option value="anthropic">Anthropic Claude Mesh</option>
                  <option value="openai">OpenAI Fabric</option>
                  <option value="simulator">Deterministic Simulator</option>
                </select>
              </div>

              <div>
                <label className="text-obsidian-text-secondary block mb-1.5">Failover Provider</label>
                <select
                  value={fallbackProvider}
                  onChange={(e) => setFallbackProvider(e.target.value as ProviderType)}
                  className="w-full bg-obsidian-card border border-obsidian-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-obsidian-border-active text-xs"
                >
                  <option value="anthropic">Anthropic Claude Mesh</option>
                  <option value="gemini">Google Gemini Mesh</option>
                  <option value="openai">OpenAI Fabric</option>
                  <option value="simulator">Deterministic Simulator</option>
                </select>
              </div>

              <div>
                <label className="text-obsidian-text-secondary block mb-1.5">Monthly Budget Limit ($)</label>
                <input
                  type="number"
                  min="500"
                  max="50000"
                  step="500"
                  value={maxMonthlyBudgetUsd}
                  onChange={(e) => setMaxMonthlyBudgetUsd(Number(e.target.value))}
                  className="w-full bg-obsidian-card border border-obsidian-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-obsidian-border-active text-xs"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-accent-indigo hover:bg-accent-indigo-dark text-white font-mono text-xs font-semibold shadow-glow-indigo transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Policy Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

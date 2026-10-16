'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { TraceWaterfallDrawer } from '@/components/traces/TraceWaterfallDrawer';
import { RequestTrace } from '@/core/types';
import {
  Activity,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

export default function TracesPage() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');

  const [traces, setTraces] = useState<RequestTrace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<RequestTrace | null>(null);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cacheHitOnly, setCacheHitOnly] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchTraces = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (providerFilter !== 'all') params.set('provider', providerFilter);
      if (tierFilter !== 'all') params.set('tier', tierFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (cacheHitOnly) params.set('cacheHit', 'true');
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/v1/traces?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTraces(data.traces || []);

        if (initialId && !selectedTrace) {
          const matched = (data.traces || []).find((t: RequestTrace) => t.id === initialId);
          if (matched) setSelectedTrace(matched);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraces();
  }, [providerFilter, tierFilter, statusFilter, cacheHitOnly]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchTraces, 3500);
    return () => clearInterval(interval);
  }, [autoRefresh, providerFilter, tierFilter, statusFilter, cacheHitOnly, search]);

  return (
    <AppShell title="Live Trace Explorer & Waterfall Studio">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent-indigo" />
              Live Request Traces & Microsecond Hop Telemetry
            </h2>
            <p className="text-xs text-obsidian-text-muted mt-0.5">
              Filterable real-time trace log. Click any trace to open the slide-over Gantt Waterfall Drawer.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all border',
                autoRefresh
                  ? 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30'
                  : 'bg-obsidian-surface text-obsidian-text-muted border-obsidian-border'
              )}
            >
              <RefreshCw className={cn('w-3 h-3', autoRefresh && 'animate-spin')} />
              <span>{autoRefresh ? 'Live Polling Active' : 'Polling Paused'}</span>
            </button>

            <button
              onClick={fetchTraces}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-obsidian-surface hover:bg-obsidian-hover border border-obsidian-border text-xs text-white transition-all font-mono"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-obsidian-text-muted" />
            <input
              type="text"
              placeholder="Search by Trace ID, prompt, or model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchTraces()}
              className="w-full bg-obsidian-card border border-obsidian-border rounded-lg pl-9 pr-3 py-2 text-white placeholder:text-obsidian-text-muted focus:outline-none focus:border-obsidian-border-active font-mono text-xs"
            />
          </div>

          {/* Provider Filter */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="bg-obsidian-card border border-obsidian-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-obsidian-border-active font-mono text-xs"
          >
            <option value="all">All Providers</option>
            <option value="gemini">Google Gemini</option>
            <option value="anthropic">Anthropic Claude</option>
            <option value="openai">OpenAI Fabric</option>
            <option value="simulator">Local Simulator</option>
          </select>

          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="bg-obsidian-card border border-obsidian-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-obsidian-border-active font-mono text-xs"
          >
            <option value="all">All Tiers</option>
            <option value="tier-1-fast">Tier 1 (Fast / Edge)</option>
            <option value="tier-2-balanced">Tier 2 (Balanced)</option>
            <option value="tier-3-deep">Tier 3 (Deep Reasoning)</option>
          </select>

          {/* Cache Hit Toggle */}
          <button
            onClick={() => setCacheHitOnly(!cacheHitOnly)}
            className={cn(
              'px-3 py-2 rounded-lg font-mono text-xs border transition-all flex items-center justify-center gap-2',
              cacheHitOnly
                ? 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/40'
                : 'bg-obsidian-card text-obsidian-text-secondary border-obsidian-border hover:text-white'
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{cacheHitOnly ? 'Cache Hits Only' : 'All Requests'}</span>
          </button>
        </div>

        {/* Traces Table */}
        <div className="bg-obsidian-surface border border-obsidian-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-obsidian-border bg-obsidian-card/50 text-obsidian-text-muted text-[11px]">
                  <th className="py-3 px-4 font-medium">Trace ID</th>
                  <th className="py-3 px-4 font-medium">Timestamp</th>
                  <th className="py-3 px-4 font-medium">Model Routed</th>
                  <th className="py-3 px-4 font-medium">Provider</th>
                  <th className="py-3 px-4 font-medium">Tier</th>
                  <th className="py-3 px-4 font-medium">Cache</th>
                  <th className="py-3 px-4 font-medium">Tokens</th>
                  <th className="py-3 px-4 font-medium">Latency</th>
                  <th className="py-3 px-4 font-medium">Cost</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-obsidian-border/40 text-obsidian-text-secondary">
                {traces.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-obsidian-text-muted text-xs">
                      No traces match current filters.
                    </td>
                  </tr>
                ) : (
                  traces.map((t) => {
                    const isSelected = selectedTrace?.id === t.id;

                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTrace(t)}
                        className={cn(
                          'cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-accent-indigo/10 text-white'
                            : 'hover:bg-obsidian-hover/50'
                        )}
                      >
                        <td className="py-3 px-4 font-semibold text-white">
                          <span className="hover:text-accent-indigo transition-colors">
                            {t.id}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-obsidian-text-muted">
                          {new Date(t.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-4 text-white font-medium">{t.modelRouted}</td>
                        <td className="py-3 px-4">
                          <span className="capitalize">{t.provider}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-obsidian-card border border-obsidian-border">
                            {t.routingTier}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {t.cacheHit ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30">
                              HIT
                            </span>
                          ) : (
                            <span className="text-obsidian-text-muted text-[10px]">MISS</span>
                          )}
                        </td>
                        <td className="py-3 px-4">{t.totalTokens} tok</td>
                        <td className="py-3 px-4 font-semibold text-white">{t.latencyMs} ms</td>
                        <td className="py-3 px-4 text-accent-indigo">{formatCurrency(t.actualCost)}</td>
                        <td className="py-3 px-4">
                          {t.status === 'succeeded' ? (
                            <span className="text-accent-emerald flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3 h-3" />
                              ok
                            </span>
                          ) : t.status === 'fallback_routed' ? (
                            <span className="text-accent-amber flex items-center gap-1 text-[11px]">
                              <AlertTriangle className="w-3 h-3" />
                              failover
                            </span>
                          ) : (
                            <span className="text-accent-rose flex items-center gap-1 text-[11px]">
                              <XCircle className="w-3 h-3" />
                              failed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Slide-over Gantt Waterfall Drawer */}
        <TraceWaterfallDrawer
          trace={selectedTrace}
          onClose={() => setSelectedTrace(null)}
        />
      </div>
    </AppShell>
  );
}

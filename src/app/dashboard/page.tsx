'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/shell/AppShell';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ProviderMeshGrid } from '@/components/dashboard/ProviderMeshGrid';
import { LatencyAreaChart } from '@/components/dashboard/LatencyAreaChart';
import { FinOpsSavingsChart } from '@/components/dashboard/FinOpsSavingsChart';
import { RoutingTopologyGraph } from '@/components/dashboard/RoutingTopologyGraph';
import { TelemetrySnapshot, RequestTrace, ProviderType } from '@/core/types';
import {
  Activity,
  Zap,
  Layers,
  Coins,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';

export default function DashboardPage() {
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/v1/telemetry/stats');
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // 1. Initial snapshot fetch
    fetchStats();

    // 2. Connect to live SSE feed
    const eventSource = new EventSource('/api/v1/telemetry/stream');

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'snapshot') {
          setSnapshot(payload.data);
        } else if (payload.type === 'trace') {
          setSnapshot((prev) => {
            if (!prev) return null;
            const updatedTraces = [payload.data, ...prev.recentTraces].slice(0, 30);
            return {
              ...prev,
              totalRequests: prev.totalRequests + 1,
              cacheHits: payload.data.cacheHit ? prev.cacheHits + 1 : prev.cacheHits,
              totalDollarsSaved: Number((prev.totalDollarsSaved + payload.data.dollarsSaved).toFixed(4)),
              totalActualCost: Number((prev.totalActualCost + payload.data.actualCost).toFixed(4)),
              recentTraces: updatedTraces,
            };
          });
        } else if (payload.type === 'circuit') {
          setSnapshot((prev) => {
            if (!prev) return null;
            return { ...prev, circuitStates: payload.data };
          });
        }
      } catch {
        // ignore parse error
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const totalReqs = snapshot?.totalRequests || 0;
  const p95Latency = snapshot?.p95LatencyMs || 0;
  const cacheHitRatio = snapshot?.cacheHitRatio ? Math.round(snapshot.cacheHitRatio * 100) : 0;
  const dollarsSaved = snapshot?.totalDollarsSaved || 0;
  const traces = snapshot?.recentTraces || [];
  const circuits = snapshot?.circuitStates || ({} as Record<ProviderType, any>);

  return (
    <AppShell title="Command Center Dashboard">
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* KPI Ribbon */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Gateway Requests"
            value={formatNumber(totalReqs)}
            subValue={`${snapshot?.requestsPerSecond || 14.2} req/sec throughput`}
            icon={Activity}
            badge="Healthy"
            badgeType="emerald"
          />
          <KpiCard
            title="P95 Pipeline Latency"
            value={`${p95Latency} ms`}
            subValue="Target SLA: < 1500 ms"
            icon={Zap}
            badge={p95Latency < 1000 ? 'Optimal' : 'Degraded'}
            badgeType={p95Latency < 1000 ? 'emerald' : 'amber'}
          />
          <KpiCard
            title="Semantic Cache Hit Ratio"
            value={`${cacheHitRatio}%`}
            subValue={`${snapshot?.cacheHits || 0} sub-15ms cache hits`}
            icon={Layers}
            badge="< 15ms TTFT"
            badgeType="indigo"
          />
          <KpiCard
            title="FinOps Dollars Saved"
            value={formatCurrency(dollarsSaved)}
            subValue="vs Frontier Flagship baseline"
            icon={Coins}
            badge="MoE Down-Route"
            badgeType="emerald"
          />
        </section>

        {/* Live Interactive DAG Routing Topology */}
        <section>
          <RoutingTopologyGraph
            circuits={circuits}
            cacheHitRatio={snapshot?.cacheHitRatio || 0.9}
          />
        </section>

        {/* Upstream Provider Mesh & Chaos Control Center */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent-indigo" />
                Upstream Provider Mesh & Circuit Breakers
              </h2>
              <p className="text-xs text-obsidian-text-muted">
                Active FSM state machines with automatic sub-5ms failover routing and real-time chaos injection
              </p>
            </div>
            <button
              onClick={fetchStats}
              className="text-xs text-obsidian-text-secondary hover:text-white font-mono transition-colors"
            >
              Refresh Snapshot
            </button>
          </div>

          <ProviderMeshGrid circuits={circuits} onRefresh={fetchStats} />
        </section>

        {/* Telemetry Visualizations: Latency Stream & FinOps Ledger */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Latency Streaming Chart */}
          <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-semibold text-white">Live Pipeline Latency Stream</h3>
                <p className="text-[11px] text-obsidian-text-muted">
                  Per-request execution duration across all hops with P95 threshold reference line
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-indigo/15 text-accent-indigo border border-accent-indigo/30">
                Microsecond Precision
              </span>
            </div>
            <LatencyAreaChart traces={traces} />
          </div>

          {/* FinOps Cost Ledger Chart */}
          <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-semibold text-white">FinOps Ledger & Cost Savings</h3>
                <p className="text-[11px] text-obsidian-text-muted">
                  Actual Gateway Cost vs Frontier Baseline per request (millidollars)
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30">
                Up to 90% FinOps Delta
              </span>
            </div>
            <FinOpsSavingsChart traces={traces} />
          </div>
        </section>

        {/* Recent Live Traces Stream Table */}
        <section className="bg-obsidian-surface border border-obsidian-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent-emerald" />
                Live Request Stream & Microsecond Timings
              </h3>
              <p className="text-[11px] text-obsidian-text-muted">
                Real-time request log with complexity scores, routed model, cache hit status, and hop latencies
              </p>
            </div>
            <Link
              href="/traces"
              className="flex items-center gap-1 text-xs text-accent-indigo hover:text-accent-indigo-light font-medium transition-colors"
            >
              <span>View Full Trace Waterfall</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-obsidian-border text-obsidian-text-muted text-[11px]">
                  <th className="pb-2.5 font-medium">Trace ID</th>
                  <th className="pb-2.5 font-medium">Timestamp</th>
                  <th className="pb-2.5 font-medium">Model Routed</th>
                  <th className="pb-2.5 font-medium">Tier</th>
                  <th className="pb-2.5 font-medium">Cache</th>
                  <th className="pb-2.5 font-medium">Tokens</th>
                  <th className="pb-2.5 font-medium">Latency</th>
                  <th className="pb-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-obsidian-border/50 text-obsidian-text-secondary text-[11px]">
                {traces.slice(0, 7).map((t) => (
                  <tr key={t.id} className="hover:bg-obsidian-hover/50 transition-colors">
                    <td className="py-2.5 text-white font-medium">
                      <Link href={`/traces?id=${t.id}`} className="hover:text-accent-indigo underline decoration-obsidian-border">
                        {t.id.substring(0, 14)}...
                      </Link>
                    </td>
                    <td className="py-2.5 text-obsidian-text-muted">
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 text-white">{t.modelRouted}</td>
                    <td className="py-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-obsidian-card border border-obsidian-border text-obsidian-text-secondary">
                        {t.routingTier}
                      </span>
                    </td>
                    <td className="py-2.5">
                      {t.cacheHit ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30">
                          HIT (0ms)
                        </span>
                      ) : (
                        <span className="text-obsidian-text-muted text-[10px]">MISS</span>
                      )}
                    </td>
                    <td className="py-2.5">{t.totalTokens} tok</td>
                    <td className="py-2.5 font-medium text-white">{t.latencyMs} ms</td>
                    <td className="py-2.5">
                      <span
                        className={
                          t.status === 'succeeded'
                            ? 'text-accent-emerald'
                            : t.status === 'fallback_routed'
                            ? 'text-accent-amber'
                            : 'text-accent-rose'
                        }
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

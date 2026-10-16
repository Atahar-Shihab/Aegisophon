'use client';

import React from 'react';
import { RequestTrace } from '@/core/types';
import {
  ArrowRight,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface ReplayComparatorProps {
  original: RequestTrace;
  replayed: RequestTrace;
}

export function ReplayComparator({ original, replayed }: ReplayComparatorProps) {
  const latencyDelta = Number((replayed.latencyMs - original.latencyMs).toFixed(1));
  const costDelta = Number((replayed.actualCost - original.actualCost).toFixed(6));
  const tokensDelta = replayed.totalTokens - original.totalTokens;

  return (
    <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between border-b border-obsidian-border pb-3">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Time-Travel Replay Comparison
          </h3>
          <p className="text-[11px] text-obsidian-text-muted">
            Side-by-side execution diff comparing original vs replayed trace
          </p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-indigo/15 text-accent-indigo border border-accent-indigo/30">
          A/B Variance Verified
        </span>
      </div>

      {/* Deltas Ribbon */}
      <div className="grid grid-cols-3 gap-3 font-mono text-xs">
        {/* Latency Delta */}
        <div className="p-3 rounded-lg bg-obsidian-card border border-obsidian-border">
          <div className="text-[10px] text-obsidian-text-muted flex items-center justify-between">
            <span>Latency Delta</span>
            <Clock className="w-3 h-3 text-obsidian-text-muted" />
          </div>
          <div
            className={cn(
              'text-sm font-bold mt-1 flex items-center gap-1',
              latencyDelta <= 0 ? 'text-accent-emerald' : 'text-accent-rose'
            )}
          >
            {latencyDelta <= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
            <span>
              {latencyDelta > 0 ? `+${latencyDelta}` : latencyDelta} ms
            </span>
          </div>
        </div>

        {/* Cost Delta */}
        <div className="p-3 rounded-lg bg-obsidian-card border border-obsidian-border">
          <div className="text-[10px] text-obsidian-text-muted flex items-center justify-between">
            <span>FinOps Cost Delta</span>
            <Coins className="w-3 h-3 text-obsidian-text-muted" />
          </div>
          <div
            className={cn(
              'text-sm font-bold mt-1 flex items-center gap-1',
              costDelta <= 0 ? 'text-accent-emerald' : 'text-accent-rose'
            )}
          >
            {costDelta <= 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
            <span>
              {costDelta > 0 ? `+${formatCurrency(costDelta)}` : formatCurrency(costDelta)}
            </span>
          </div>
        </div>

        {/* Tokens Delta */}
        <div className="p-3 rounded-lg bg-obsidian-card border border-obsidian-border">
          <div className="text-[10px] text-obsidian-text-muted flex items-center justify-between">
            <span>Tokens Delta</span>
            <Cpu className="w-3 h-3 text-obsidian-text-muted" />
          </div>
          <div className="text-sm font-bold mt-1 text-white">
            {tokensDelta > 0 ? `+${tokensDelta}` : tokensDelta} tok
          </div>
        </div>
      </div>

      {/* Side-by-Side Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
        {/* Original Trace Card */}
        <div className="p-4 rounded-xl bg-obsidian-card border border-obsidian-border space-y-3">
          <div className="flex items-center justify-between text-obsidian-text-muted text-[11px]">
            <span>ORIGINAL TRACE</span>
            <span className="text-white">{original.id.substring(0, 14)}...</span>
          </div>

          <div>
            <div className="text-sm font-bold text-white">{original.modelRouted}</div>
            <div className="text-[11px] text-obsidian-text-secondary capitalize">
              {original.provider} ({original.routingTier})
            </div>
          </div>

          <div className="space-y-1 pt-2 border-t border-obsidian-border text-[11px]">
            <div className="flex justify-between">
              <span className="text-obsidian-text-muted">Total Latency:</span>
              <span className="text-white font-medium">{original.latencyMs} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-obsidian-text-muted">Tokens:</span>
              <span className="text-white">{original.totalTokens}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-obsidian-text-muted">Actual Cost:</span>
              <span className="text-accent-indigo font-medium">{formatCurrency(original.actualCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-obsidian-text-muted">Cache:</span>
              <span className={original.cacheHit ? 'text-accent-emerald' : 'text-obsidian-text-muted'}>
                {original.cacheHit ? 'HIT (0ms)' : 'MISS'}
              </span>
            </div>
          </div>
        </div>

        {/* Replayed Trace Card */}
        <div className="p-4 rounded-xl bg-obsidian-card border border-accent-indigo/40 shadow-glow-indigo space-y-3">
          <div className="flex items-center justify-between text-accent-indigo text-[11px]">
            <span>FORKED REPLAY</span>
            <span className="text-white">{replayed.id.substring(0, 14)}...</span>
          </div>

          <div>
            <div className="text-sm font-bold text-white">{replayed.modelRouted}</div>
            <div className="text-[11px] text-obsidian-text-secondary capitalize">
              {replayed.provider} ({replayed.routingTier})
            </div>
          </div>

          <div className="space-y-1 pt-2 border-t border-obsidian-border text-[11px]">
            <div className="flex justify-between">
              <span className="text-obsidian-text-muted">Total Latency:</span>
              <span className="text-white font-medium">{replayed.latencyMs} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-obsidian-text-muted">Tokens:</span>
              <span className="text-white">{replayed.totalTokens}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-obsidian-text-muted">Actual Cost:</span>
              <span className="text-accent-indigo font-medium">{formatCurrency(replayed.actualCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-obsidian-text-muted">Cache:</span>
              <span className={replayed.cacheHit ? 'text-accent-emerald' : 'text-obsidian-text-muted'}>
                {replayed.cacheHit ? 'HIT (0ms)' : 'MISS'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

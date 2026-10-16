'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { RequestTrace, PipelineHop } from '@/core/types';
import {
  X,
  Clock,
  PlaySquare,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface TraceWaterfallDrawerProps {
  trace: RequestTrace | null;
  onClose: () => void;
}

export function TraceWaterfallDrawer({ trace, onClose }: TraceWaterfallDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [expandedHops, setExpandedHops] = useState<Record<number, boolean>>({});

  if (!trace) return null;

  const totalLatency = Math.max(0.1, trace.latencyMs);

  const toggleHop = (index: number) => {
    setExpandedHops((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(trace, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: PipelineHop['status']) => {
    switch (status) {
      case 'cache_hit':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-accent-emerald bg-accent-emerald/15 px-2 py-0.5 rounded border border-accent-emerald/30">
            <CheckCircle2 className="w-3 h-3" />
            CACHE HIT
          </span>
        );
      case 'degraded':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-accent-amber bg-accent-amber/15 px-2 py-0.5 rounded border border-accent-amber/30">
            <AlertTriangle className="w-3 h-3" />
            DEGRADED
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-accent-rose bg-accent-rose/15 px-2 py-0.5 rounded border border-accent-rose/30">
            <XCircle className="w-3 h-3" />
            FAILED
          </span>
        );
      case 'skipped':
        return (
          <span className="text-[10px] font-mono text-obsidian-text-muted bg-obsidian-card px-2 py-0.5 rounded border border-obsidian-border">
            SKIPPED
          </span>
        );
      case 'ok':
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-accent-emerald bg-accent-emerald/10 px-2 py-0.5 rounded border border-accent-emerald/20">
            <CheckCircle2 className="w-3 h-3" />
            OK
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-obsidian-surface border-l border-obsidian-border h-full flex flex-col justify-between overflow-hidden shadow-obsidian-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-obsidian-border flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-accent-indigo/15 text-accent-indigo border border-accent-indigo/30">
                Trace Waterfall
              </span>
              <span className="text-xs font-mono text-obsidian-text-muted">
                {new Date(trace.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <h2 className="text-base font-bold font-mono text-white">{trace.id}</h2>
            <p className="text-xs text-obsidian-text-secondary mt-1">
              Routed to <span className="text-white font-medium">{trace.modelRouted}</span> via{' '}
              <span className="text-accent-indigo font-medium">{trace.provider}</span> ({trace.routingTier})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyJson}
              className="p-2 rounded-lg bg-obsidian-card hover:bg-obsidian-hover border border-obsidian-border text-obsidian-text-secondary hover:text-white transition-all text-xs"
              title="Copy Full Trace JSON"
            >
              {copied ? <Check className="w-4 h-4 text-accent-emerald" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-obsidian-card hover:bg-obsidian-hover border border-obsidian-border text-obsidian-text-secondary hover:text-white transition-all text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Metric Ribbon */}
          <div className="grid grid-cols-4 gap-2 p-3 bg-obsidian-card border border-obsidian-border rounded-xl text-center font-mono">
            <div>
              <div className="text-[10px] text-obsidian-text-muted">Total Latency</div>
              <div className="text-sm font-bold text-white">{trace.latencyMs} ms</div>
            </div>
            <div>
              <div className="text-[10px] text-obsidian-text-muted">Total Tokens</div>
              <div className="text-sm font-bold text-white">{trace.totalTokens}</div>
            </div>
            <div>
              <div className="text-[10px] text-obsidian-text-muted">Actual Cost</div>
              <div className="text-sm font-bold text-accent-indigo">{formatCurrency(trace.actualCost)}</div>
            </div>
            <div>
              <div className="text-[10px] text-obsidian-text-muted">FinOps Saved</div>
              <div className="text-sm font-bold text-accent-emerald">{formatCurrency(trace.dollarsSaved)}</div>
            </div>
          </div>

          {/* Failover Notice (if any) */}
          {trace.failoverHistory && trace.failoverHistory.length > 0 && (
            <div className="p-3 bg-accent-amber/10 border border-accent-amber/30 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-accent-amber font-mono">
                <ShieldAlert className="w-4 h-4" />
                Automatic Upstream Failover Activated
              </div>
              {trace.failoverHistory.map((fo, idx) => (
                <div key={idx} className="text-[11px] font-mono text-obsidian-text-secondary pl-6">
                  Trip on provider <span className="text-white">{fo.provider}</span>: {fo.error} ({fo.durationMs}ms)
                </div>
              ))}
            </div>
          )}

          {/* Granular Pipeline Gantt Waterfall */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-white font-semibold">Microsecond Pipeline Hop Gantt</span>
              <span className="text-obsidian-text-muted">6 Instrument Stages</span>
            </div>

            <div className="space-y-2">
              {trace.hops.map((hop, idx) => {
                const widthPercent = Math.max(2, Math.min(100, Math.round((hop.durationMs / totalLatency) * 100)));
                const isExpanded = !!expandedHops[idx];

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-obsidian-card border border-obsidian-border hover:border-obsidian-border-active transition-all"
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleHop(idx)}
                    >
                      <div className="flex items-center gap-2 text-xs font-mono">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-obsidian-text-muted" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-obsidian-text-muted" />
                        )}
                        <span className="text-white font-medium">{hop.stage}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-medium text-white">
                          {hop.durationMs} ms
                        </span>
                        {getStatusBadge(hop.status)}
                      </div>
                    </div>

                    {/* Timeline Flame Bar */}
                    <div className="mt-2.5 h-1.5 w-full bg-obsidian-hover rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          hop.status === 'cache_hit'
                            ? 'bg-accent-emerald'
                            : hop.status === 'degraded'
                            ? 'bg-accent-amber'
                            : hop.status === 'failed'
                            ? 'bg-accent-rose'
                            : 'bg-accent-indigo'
                        )}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>

                    {/* Expanded JSON Metadata */}
                    {isExpanded && hop.metadata && (
                      <div className="mt-3 pt-3 border-t border-obsidian-border text-[11px] font-mono">
                        <div className="text-[10px] text-obsidian-text-muted mb-1">Hop Metadata</div>
                        <pre className="p-2 rounded bg-obsidian-bg text-obsidian-text-secondary overflow-x-auto">
                          {JSON.stringify(hop.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prompt Full Text */}
          <div className="space-y-1.5">
            <span className="text-xs font-mono text-obsidian-text-muted">Original Input Prompt</span>
            <div className="p-3 rounded-lg bg-obsidian-card border border-obsidian-border text-xs text-white whitespace-pre-wrap font-mono">
              {trace.promptFull}
            </div>
          </div>

          {/* Response Preview */}
          <div className="space-y-1.5">
            <span className="text-xs font-mono text-obsidian-text-muted">Response Summary</span>
            <div className="p-3 rounded-lg bg-obsidian-card border border-obsidian-border text-xs text-obsidian-text-secondary whitespace-pre-wrap font-mono">
              {trace.responsePreview}
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-6 border-t border-obsidian-border bg-obsidian-card flex items-center justify-between">
          <div className="text-xs text-obsidian-text-muted font-mono">
            Complexity Score: <span className="text-white font-medium">{trace.complexityScore}</span>
          </div>

          <Link
            href={`/playground?replayId=${trace.id}`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-indigo hover:bg-accent-indigo-dark text-white text-xs font-mono font-medium shadow-glow-indigo transition-all"
          >
            <PlaySquare className="w-4 h-4" />
            <span>Fork & Replay in Studio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

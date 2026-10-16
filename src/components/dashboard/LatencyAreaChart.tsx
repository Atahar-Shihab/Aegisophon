'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { RequestTrace } from '@/core/types';

interface LatencyAreaChartProps {
  traces: RequestTrace[];
  p95ThresholdMs?: number;
}

export function LatencyAreaChart({ traces, p95ThresholdMs = 1500 }: LatencyAreaChartProps) {
  // Format traces in chronological order (oldest to newest)
  const chartData = [...traces]
    .slice(0, 30)
    .reverse()
    .map((t, idx) => ({
      index: idx + 1,
      latency: t.latencyMs,
      model: t.modelRouted,
      cacheHit: t.cacheHit,
      timestamp: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }));

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-obsidian-text-muted">
        Awaiting live latency telemetry...
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="timestamp"
            stroke="#64748B"
            fontSize={10}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
          />
          <YAxis
            stroke="#64748B"
            fontSize={10}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
            unit="ms"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="rounded-lg bg-obsidian-surface border border-obsidian-border p-2.5 shadow-obsidian-card font-mono text-[11px]">
                    <div className="text-white font-semibold flex items-center gap-2">
                      <span>{data.latency} ms</span>
                      {data.cacheHit && (
                        <span className="text-[9px] px-1 rounded bg-accent-emerald/20 text-accent-emerald">
                          CACHE HIT
                        </span>
                      )}
                    </div>
                    <div className="text-obsidian-text-muted text-[10px] mt-1">{data.model}</div>
                    <div className="text-obsidian-text-muted text-[9px]">{data.timestamp}</div>
                  </div>
                );
              }
              return null;
            }}
          />
          <ReferenceLine
            y={p95ThresholdMs}
            stroke="#F43F5E"
            strokeDasharray="3 3"
            label={{ value: `P95 Limit (${p95ThresholdMs}ms)`, fill: '#F43F5E', fontSize: 10, position: 'insideTopRight' }}
          />
          <Area
            type="monotone"
            dataKey="latency"
            stroke="#6366F1"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#latencyGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

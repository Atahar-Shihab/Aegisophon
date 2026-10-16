'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { RequestTrace } from '@/core/types';

interface FinOpsSavingsChartProps {
  traces: RequestTrace[];
}

export function FinOpsSavingsChart({ traces }: FinOpsSavingsChartProps) {
  const chartData = [...traces]
    .slice(0, 15)
    .reverse()
    .map((t, idx) => ({
      name: `#${idx + 1}`,
      actualCost: Number((t.actualCost * 1000).toFixed(4)), // in millidollars ($ / 1000) for visual clarity
      baselineCost: Number((t.frontierCostBaseline * 1000).toFixed(4)),
      dollarsSaved: Number((t.dollarsSaved * 1000).toFixed(4)),
      cacheHit: t.cacheHit,
      model: t.modelRouted,
    }));

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-obsidian-text-muted">
        Awaiting FinOps ledger telemetry...
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="name"
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
            unit="m$"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="rounded-lg bg-obsidian-surface border border-obsidian-border p-2.5 shadow-obsidian-card font-mono text-[11px]">
                    <div className="text-white font-semibold mb-1">
                      Request {data.name} ({data.model})
                    </div>
                    <div className="text-accent-rose flex justify-between gap-4">
                      <span>Frontier Baseline:</span>
                      <span>${(data.baselineCost / 1000).toFixed(6)}</span>
                    </div>
                    <div className="text-accent-indigo flex justify-between gap-4">
                      <span>Actual Gateway Cost:</span>
                      <span>${(data.actualCost / 1000).toFixed(6)}</span>
                    </div>
                    <div className="text-accent-emerald font-semibold flex justify-between gap-4 pt-1 border-t border-obsidian-border mt-1">
                      <span>Dollars Saved:</span>
                      <span>${(data.dollarsSaved / 1000).toFixed(6)}</span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
          />
          <Bar name="Actual Gateway Cost" dataKey="actualCost" fill="#6366F1" radius={[4, 4, 0, 0]} />
          <Bar name="Dollars Saved" dataKey="dollarsSaved" fill="#10B981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

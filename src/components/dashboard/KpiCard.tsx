'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  badge?: string;
  badgeType?: 'emerald' | 'amber' | 'indigo' | 'rose';
  trend?: string;
}

export function KpiCard({
  title,
  value,
  subValue,
  icon: Icon,
  badge,
  badgeType = 'indigo',
  trend,
}: KpiCardProps) {
  const badgeClasses = {
    emerald: 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30',
    amber: 'bg-accent-amber/15 text-accent-amber border-accent-amber/30',
    indigo: 'bg-accent-indigo/15 text-accent-indigo border-accent-indigo/30',
    rose: 'bg-accent-rose/15 text-accent-rose border-accent-rose/30',
  }[badgeType];

  return (
    <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-5 hover:border-obsidian-border-active transition-all group relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-obsidian-text-secondary">{title}</span>
        <div className="w-8 h-8 rounded-lg bg-obsidian-card border border-obsidian-border flex items-center justify-center text-obsidian-text-muted group-hover:text-white group-hover:border-obsidian-border-active transition-all">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-bold font-mono tracking-tight text-white">{value}</div>
        {badge && (
          <span className={cn('text-[10px] font-mono px-2 py-0.5 rounded-full border', badgeClasses)}>
            {badge}
          </span>
        )}
      </div>

      {(subValue || trend) && (
        <div className="mt-2 text-xs text-obsidian-text-muted flex items-center justify-between font-mono text-[11px]">
          <span>{subValue}</span>
          {trend && <span className="text-accent-emerald">{trend}</span>}
        </div>
      )}
    </div>
  );
}

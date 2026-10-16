'use client';

import React from 'react';
import { ComplexityAnalysis } from '@/core/classifier/complexity';
import { Cpu, Terminal, Sparkles, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComplexityMeterProps {
  analysis: ComplexityAnalysis;
}

export function ComplexityMeter({ analysis }: ComplexityMeterProps) {
  const scorePercent = Math.round(analysis.score * 100);

  const tierColors = {
    'tier-1-fast': {
      label: 'Tier 1: Fast / Edge',
      badge: 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30',
      bar: 'bg-accent-emerald',
      models: 'Gemini 1.5 Flash / Claude 3.5 Haiku',
    },
    'tier-2-balanced': {
      label: 'Tier 2: Balanced Analytics',
      badge: 'bg-accent-indigo/15 text-accent-indigo border-accent-indigo/30',
      bar: 'bg-accent-indigo',
      models: 'Claude 3.5 Sonnet / Gemini 1.5 Pro / GPT-4o',
    },
    'tier-3-deep': {
      label: 'Tier 3: Deep Reasoning',
      badge: 'bg-accent-purple/15 text-accent-purple border-accent-purple/30',
      bar: 'bg-accent-purple',
      models: 'Claude 3.7 Thinking / Gemini 2.0 Flash Thinking / o1',
    },
  }[analysis.tier];

  return (
    <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-4 space-y-4">
      {/* Header & Score Gauge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-accent-indigo" />
          <span className="text-xs font-semibold text-white">MoE Complexity Classifier</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-white">{analysis.score.toFixed(2)}</span>
          <span className={cn('text-[10px] font-mono px-2 py-0.5 rounded-full border', tierColors.badge)}>
            {tierColors.label}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="h-2 w-full bg-obsidian-card rounded-full overflow-hidden border border-obsidian-border">
          <div
            className={cn('h-full rounded-full transition-all duration-300', tierColors.bar)}
            style={{ width: `${Math.max(4, scorePercent)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-obsidian-text-muted">
          <span>0.00 (Edge/Fast)</span>
          <span>0.35 (Cutoff 1)</span>
          <span>0.70 (Cutoff 2)</span>
          <span>1.00 (Deep Reasoning)</span>
        </div>
      </div>

      {/* Factor Breakdown Chips */}
      <div className="grid grid-cols-4 gap-2 text-center font-mono text-[10px]">
        <div className="p-2 rounded bg-obsidian-card border border-obsidian-border">
          <div className="text-obsidian-text-muted">Length</div>
          <div className="font-bold text-white">{(analysis.factors.lengthFactor * 100).toFixed(0)}%</div>
        </div>
        <div className="p-2 rounded bg-obsidian-card border border-obsidian-border">
          <div className="text-obsidian-text-muted">Reasoning</div>
          <div className="font-bold text-accent-purple">{(analysis.factors.reasoningFactor * 100).toFixed(0)}%</div>
        </div>
        <div className="p-2 rounded bg-obsidian-card border border-obsidian-border">
          <div className="text-obsidian-text-muted">Code/Syntax</div>
          <div className="font-bold text-accent-indigo">{(analysis.factors.codeDensityFactor * 100).toFixed(0)}%</div>
        </div>
        <div className="p-2 rounded bg-obsidian-card border border-obsidian-border">
          <div className="text-obsidian-text-muted">Est. Tokens</div>
          <div className="font-bold text-accent-emerald">{analysis.estimatedTokens}</div>
        </div>
      </div>

      {/* Detected Signals Pills */}
      {(analysis.detectedReasoningMarkers.length > 0 || analysis.detectedCodeKeywords.length > 0) && (
        <div className="pt-2 border-t border-obsidian-border space-y-2">
          <div className="text-[10px] uppercase font-mono text-obsidian-text-muted">
            Detected Cognitive Signals & Keywords
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.detectedReasoningMarkers.map((marker, i) => (
              <span
                key={i}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-purple/10 text-accent-purple border border-accent-purple/30 flex items-center gap-1"
              >
                <Sparkles className="w-2.5 h-2.5" />
                {marker}
              </span>
            ))}
            {analysis.detectedCodeKeywords.map((kw, i) => (
              <span
                key={i}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-indigo/10 text-accent-indigo border border-accent-indigo/30 flex items-center gap-1"
              >
                <Terminal className="w-2.5 h-2.5" />
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Rationale Text */}
      <div className="text-[11px] text-obsidian-text-secondary bg-obsidian-card p-2.5 rounded-lg border border-obsidian-border flex items-start gap-2">
        <BookOpen className="w-3.5 h-3.5 text-obsidian-text-muted mt-0.5 flex-shrink-0" />
        <span>{analysis.explanation}</span>
      </div>
    </div>
  );
}

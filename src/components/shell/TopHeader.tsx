'use client';

import React, { useState, useEffect } from 'react';
import { Search, Radio, Play, Pause, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopHeaderProps {
  title?: string;
  onOpenCommandPalette: () => void;
}

export function TopHeader({ title = 'Command Center', onOpenCommandPalette }: TopHeaderProps) {
  const [simulatorActive, setSimulatorActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [liveConnected, setLiveConnected] = useState(true);

  // Check initial simulator status
  useEffect(() => {
    fetch('/api/v1/traffic-simulator')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.running === 'boolean') {
          setSimulatorActive(data.running);
        }
      })
      .catch(() => setLiveConnected(false));
  }, []);

  const handleToggleSimulator = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/traffic-simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle' }),
      });
      const data = await res.json();
      setSimulatorActive(data.running);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="h-16 border-b border-obsidian-border bg-obsidian-bg/80 backdrop-blur-md sticky top-0 z-20 px-8 flex items-center justify-between">
      {/* Title & Page Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-white tracking-tight">{title}</h1>
        <span className="text-obsidian-border">/</span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-obsidian-surface border border-obsidian-border text-[11px] text-obsidian-text-secondary">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              liveConnected ? 'bg-accent-emerald animate-pulse' : 'bg-accent-rose'
            )}
          />
          <span className="font-mono text-[10px]">
            {liveConnected ? 'SSE Feed Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Actions: Live Traffic Simulator & Cmd+K */}
      <div className="flex items-center gap-3">
        {/* Live Traffic Simulator Button */}
        <button
          onClick={handleToggleSimulator}
          disabled={loading}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border',
            simulatorActive
              ? 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/40 shadow-glow-emerald animate-pulse-subtle'
              : 'bg-obsidian-surface text-obsidian-text-secondary border-obsidian-border hover:text-white hover:border-obsidian-border-active'
          )}
          title="Toggle background synthetic traffic generator"
        >
          {simulatorActive ? (
            <>
              <Pause className="w-3.5 h-3.5 text-accent-emerald" />
              <span>Live Traffic: Running</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-obsidian-text-secondary group-hover:text-white" />
              <span>Start Live Traffic</span>
            </>
          )}
        </button>

        {/* Global Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-obsidian-surface hover:bg-obsidian-hover border border-obsidian-border hover:border-obsidian-border-active text-xs text-obsidian-text-muted hover:text-white transition-all shadow-sm"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-xs">Quick Jump</span>
          <kbd className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-obsidian-card border border-obsidian-border rounded text-obsidian-text-secondary">
            ⌘K
          </kbd>
        </button>
      </div>
    </header>
  );
}

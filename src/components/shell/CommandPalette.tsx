'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  Activity,
  PlaySquare,
  Sliders,
  ShieldCheck,
  Zap,
  RotateCcw,
  Play,
  Pause,
  AlertTriangle,
  BookOpen,
  Code2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenIntegrationModal?: () => void;
}

export function CommandPalette({ isOpen, onClose, onOpenIntegrationModal }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open in parent
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navigate = (path: string) => {
    router.push(path);
    onClose();
  };

  const triggerChaos = async (provider: string, type: string) => {
    try {
      await fetch('/api/v1/chaos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, type }),
      });
    } catch {
      // ignore
    }
    onClose();
  };

  const resetAllCircuits = async () => {
    try {
      await fetch('/api/v1/circuit', { method: 'POST' });
    } catch {
      // ignore
    }
    onClose();
  };

  const toggleTraffic = async () => {
    try {
      await fetch('/api/v1/traffic-simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle' }),
      });
    } catch {
      // ignore
    }
    onClose();
  };

  const commands = [
    {
      group: 'Navigation',
      items: [
        {
          id: 'nav-dash',
          name: 'Go to Command Center Dashboard',
          icon: LayoutDashboard,
          action: () => navigate('/dashboard'),
        },
        {
          id: 'nav-traces',
          name: 'Go to Live Trace Waterfall Explorer',
          icon: Activity,
          action: () => navigate('/traces'),
        },
        {
          id: 'nav-play',
          name: 'Open Time-Travel Replay Studio & MoE Simulator',
          icon: PlaySquare,
          action: () => navigate('/playground'),
        },
        {
          id: 'nav-pol',
          name: 'Configure FinOps Policies & Thresholds',
          icon: Sliders,
          action: () => navigate('/policies'),
        },
        {
          id: 'nav-sec',
          name: 'Manage Cryptographic API Keys & Security Audit',
          icon: ShieldCheck,
          action: () => navigate('/security'),
        },
        {
          id: 'nav-docs',
          name: 'Open Interactive API Reference & OpenAPI Docs',
          icon: BookOpen,
          action: () => navigate('/docs'),
        },
      ],
    },
    {
      group: 'Chaos Engineering & Operations',
      items: [
        {
          id: 'op-sdk',
          name: 'Integrate Gateway SDK (OpenAI Drop-In Code Snippets)',
          icon: Code2,
          action: () => {
            onClose();
            onOpenIntegrationModal?.();
          },
        },
        {
          id: 'op-traffic',
          name: 'Toggle Live Background Traffic Simulator',
          icon: Zap,
          action: toggleTraffic,
        },
        {
          id: 'op-chaos-gemini',
          name: 'Inject Chaos: Latency Spike (3,500ms) on Google Gemini',
          icon: AlertTriangle,
          action: () => triggerChaos('gemini', 'latency_spike'),
        },
        {
          id: 'op-chaos-anthropic',
          name: 'Inject Chaos: HTTP 503 Outage on Anthropic Claude',
          icon: AlertTriangle,
          action: () => triggerChaos('anthropic', 'outage_503'),
        },
        {
          id: 'op-chaos-openai',
          name: 'Inject Chaos: HTTP 429 Rate Limit on OpenAI Fabric',
          icon: AlertTriangle,
          action: () => triggerChaos('openai', 'rate_limit_429'),
        },
        {
          id: 'op-reset',
          name: 'Reset All Circuit Breakers to CLOSED (Healthy)',
          icon: RotateCcw,
          action: resetAllCircuits,
        },
      ],
    },
  ];

  const filtered = commands
    .map((grp) => ({
      ...grp,
      items: grp.items.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      ),
    }))
    .filter((grp) => grp.items.length > 0);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-obsidian-surface border border-obsidian-border rounded-xl shadow-obsidian-card overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-obsidian-border gap-3">
          <Search className="w-4 h-4 text-obsidian-text-muted" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or jump to page..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white focus:outline-none placeholder:text-obsidian-text-muted"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-obsidian-card border border-obsidian-border rounded text-obsidian-text-muted">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-obsidian-text-muted">
              No matching commands found.
            </div>
          ) : (
            filtered.map((grp) => (
              <div key={grp.group}>
                <div className="text-[10px] font-mono uppercase px-2 py-1 text-obsidian-text-muted">
                  {grp.group}
                </div>
                <div className="space-y-0.5 mt-1">
                  {grp.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-obsidian-text-secondary hover:text-white hover:bg-obsidian-hover transition-colors text-left group"
                      >
                        <Icon className="w-4 h-4 text-obsidian-text-muted group-hover:text-accent-indigo" />
                        <span className="flex-1">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

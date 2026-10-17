'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Activity,
  PlaySquare,
  Sliders,
  ShieldCheck,
  Cpu,
  Layers,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceRole } from '@/context/WorkspaceRoleContext';

const NAV_ITEMS = [
  {
    name: 'Command Center',
    href: '/dashboard',
    icon: LayoutDashboard,
    badge: 'Live',
  },
  {
    name: 'Trace Waterfall',
    href: '/traces',
    icon: Activity,
  },
  {
    name: 'Time-Travel Studio',
    href: '/playground',
    icon: PlaySquare,
  },
  {
    name: 'FinOps & Policies',
    href: '/policies',
    icon: Sliders,
  },
  {
    name: 'Security & Keys',
    href: '/security',
    icon: ShieldCheck,
  },
  {
    name: 'API Reference',
    href: '/docs',
    icon: BookOpen,
  },
];

export function NavigationSidebar() {
  const pathname = usePathname();
  const { activeWorkspace, activeRole } = useWorkspaceRole();

  return (
    <aside className="w-64 border-r border-obsidian-border bg-obsidian-surface flex flex-col justify-between h-screen sticky top-0 select-none z-30">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-obsidian-border gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-indigo to-accent-indigo-dark flex items-center justify-center shadow-glow-indigo">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white">AegisGateway</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-accent-indigo/15 text-accent-indigo border border-accent-indigo/30">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-obsidian-text-muted font-mono">Semantic Mesh & CB</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group relative',
                  isActive
                    ? 'bg-obsidian-hover text-white shadow-sm border border-obsidian-border'
                    : 'text-obsidian-text-secondary hover:text-white hover:bg-obsidian-hover/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-colors',
                      isActive ? 'text-accent-indigo' : 'text-obsidian-text-muted group-hover:text-white'
                    )}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-accent-indigo shadow-glow-indigo" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tenant / Mesh Status Footer */}
      <div className="p-4 border-t border-obsidian-border">
        <div className="rounded-lg bg-obsidian-card p-3 border border-obsidian-border text-xs">
          <div className="flex items-center justify-between text-[11px] text-obsidian-text-muted mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Layers className="w-3.5 h-3.5 text-accent-indigo" />
              Tenant Mesh
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-accent-indigo/15 text-accent-indigo border border-accent-indigo/30">
              {activeWorkspace.badge}
            </span>
          </div>
          <div className="font-mono text-white text-[11px] truncate font-medium" title={activeWorkspace.id}>
            {activeWorkspace.id}
          </div>
          <div className="text-[10px] text-obsidian-text-muted mt-2 flex items-center justify-between">
            <span className="capitalize text-obsidian-text-secondary">Role: {activeRole}</span>
            <span className="text-accent-emerald font-mono flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
              100% SLA
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

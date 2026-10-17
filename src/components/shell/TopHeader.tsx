'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Play,
  Pause,
  Building2,
  Shield,
  Code2,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkspaceRole, WORKSPACES, Workspace } from '@/context/WorkspaceRoleContext';
import { UserRole } from '@/core/security/rbac';

interface TopHeaderProps {
  title?: string;
  onOpenCommandPalette: () => void;
  onOpenIntegrationModal?: () => void;
}

export function TopHeader({
  title = 'Command Center',
  onOpenCommandPalette,
  onOpenIntegrationModal,
}: TopHeaderProps) {
  const [simulatorActive, setSimulatorActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [liveConnected, setLiveConnected] = useState(true);
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const { activeWorkspace, setActiveWorkspace, activeRole, setActiveRole, isReadOnly } =
    useWorkspaceRole();

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
        headers: {
          'Content-Type': 'application/json',
          'x-aegis-role': activeRole,
          'x-aegis-workspace': activeWorkspace.id,
        },
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

  const roles: Array<{ id: UserRole; label: string; badge: string }> = [
    { id: 'owner', label: 'Owner (Full Access)', badge: 'bg-accent-indigo/20 text-accent-indigo border-accent-indigo/40' },
    { id: 'admin', label: 'Admin (Keys & Policies)', badge: 'bg-accent-emerald/20 text-accent-emerald border-accent-emerald/40' },
    { id: 'developer', label: 'Developer (Chaos & Read)', badge: 'bg-accent-amber/20 text-accent-amber border-accent-amber/40' },
    { id: 'viewer', label: 'Viewer (Read-Only Lock)', badge: 'bg-gray-500/20 text-gray-300 border-gray-500/40' },
  ];

  return (
    <header className="h-16 border-b border-obsidian-border bg-obsidian-bg/80 backdrop-blur-md sticky top-0 z-20 px-8 flex items-center justify-between gap-4">
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

      {/* Middle: Tenant Workspace & Role Selectors */}
      <div className="hidden lg:flex items-center gap-2.5">
        {/* Workspace Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setWsDropdownOpen(!wsDropdownOpen);
              setRoleDropdownOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-obsidian-surface hover:bg-obsidian-hover border border-obsidian-border text-xs text-obsidian-text-secondary hover:text-white transition-all shadow-sm"
          >
            <Building2 className="w-3.5 h-3.5 text-accent-indigo" />
            <span className="font-medium text-white">{activeWorkspace.name}</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-accent-indigo/15 text-accent-indigo border border-accent-indigo/30">
              {activeWorkspace.badge}
            </span>
            <ChevronDown className="w-3 h-3 text-obsidian-text-muted" />
          </button>

          {wsDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-64 rounded-xl bg-obsidian-card border border-obsidian-border shadow-2xl p-1.5 z-50 animate-scale-in">
              <div className="text-[10px] font-mono uppercase tracking-wider text-obsidian-text-muted px-2.5 py-1">
                Active Tenant Mesh
              </div>
              {WORKSPACES.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    setActiveWorkspace(ws);
                    setWsDropdownOpen(false);
                  }}
                  className={cn(
                    'w-full text-left p-2 rounded-lg text-xs flex flex-col gap-0.5 transition-colors',
                    activeWorkspace.id === ws.id
                      ? 'bg-obsidian-hover text-white border border-obsidian-border'
                      : 'text-obsidian-text-secondary hover:text-white hover:bg-obsidian-hover/50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{ws.name}</span>
                    <span className="text-[9px] font-mono px-1 rounded bg-black/40 text-accent-indigo">
                      {ws.badge}
                    </span>
                  </div>
                  <span className="text-[10px] text-obsidian-text-muted truncate">{ws.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Role Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setRoleDropdownOpen(!roleDropdownOpen);
              setWsDropdownOpen(false);
            }}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all shadow-sm',
              isReadOnly
                ? 'bg-gray-800/40 border-gray-600 text-gray-300'
                : 'bg-obsidian-surface hover:bg-obsidian-hover border-obsidian-border text-obsidian-text-secondary hover:text-white'
            )}
          >
            {isReadOnly ? (
              <Lock className="w-3.5 h-3.5 text-accent-rose" />
            ) : (
              <Shield className="w-3.5 h-3.5 text-accent-emerald" />
            )}
            <span className="capitalize font-mono font-medium">Role: {activeRole}</span>
            <ChevronDown className="w-3 h-3 text-obsidian-text-muted" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-56 rounded-xl bg-obsidian-card border border-obsidian-border shadow-2xl p-1.5 z-50 animate-scale-in">
              <div className="text-[10px] font-mono uppercase tracking-wider text-obsidian-text-muted px-2.5 py-1">
                RBAC Access Level
              </div>
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setActiveRole(r.id);
                    setRoleDropdownOpen(false);
                  }}
                  className={cn(
                    'w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors',
                    activeRole === r.id
                      ? 'bg-obsidian-hover text-white border border-obsidian-border'
                      : 'text-obsidian-text-secondary hover:text-white hover:bg-obsidian-hover/50'
                  )}
                >
                  <span className="font-medium">{r.label}</span>
                  {r.id === 'viewer' && <Lock className="w-3 h-3 text-accent-rose" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {isReadOnly && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-rose/15 text-accent-rose border border-accent-rose/30 text-[10px] font-mono">
            <Lock className="w-3 h-3" />
            <span>Read-Only Mode</span>
          </div>
        )}
      </div>

      {/* Actions: Live Traffic Simulator, Integrate SDK & Cmd+K */}
      <div className="flex items-center gap-3">
        {/* Integrate SDK Button */}
        {onOpenIntegrationModal && (
          <button
            onClick={onOpenIntegrationModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-indigo/15 hover:bg-accent-indigo/25 text-accent-indigo border border-accent-indigo/30 text-xs font-semibold transition-all shadow-glow-indigo"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Integrate SDK</span>
          </button>
        )}

        {/* Live Traffic Simulator Button */}
        <button
          onClick={handleToggleSimulator}
          disabled={loading || isReadOnly}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border disabled:opacity-50',
            simulatorActive
              ? 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/40 shadow-glow-emerald animate-pulse-subtle'
              : 'bg-obsidian-surface text-obsidian-text-secondary border-obsidian-border hover:text-white hover:border-obsidian-border-active'
          )}
          title={isReadOnly ? 'Disabled in Read-Only Mode' : 'Toggle background synthetic traffic generator'}
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

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole, RbacAction, RbacService } from '@/core/security/rbac';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  badge: string;
  description: string;
}

export const WORKSPACES: Workspace[] = [
  {
    id: 'tenant_enterprise_default',
    name: 'Enterprise Default',
    slug: 'default-mesh',
    plan: 'Enterprise Plus',
    badge: 'Production',
    description: 'Auto-MoE dynamic routing across Gemini, Claude, and OpenAI with 99.8% FinOps cost efficiency.',
  },
  {
    id: 'acme_corp_prod',
    name: 'Acme Corp Production',
    slug: 'acme-corp-prod',
    plan: 'Enterprise Tier 3',
    badge: 'Mission-Critical',
    description: 'High-assurance quality-max policy prioritizing Claude 3.7 Thinking and OpenAI o1.',
  },
  {
    id: 'fintech_staging',
    name: 'FinTech Staging',
    slug: 'fintech-staging',
    plan: 'Standard Mesh',
    badge: 'Staging',
    description: 'Ultra low-latency profile running Haiku and Gemini Flash canary endpoints.',
  },
];

interface WorkspaceRoleContextType {
  activeWorkspace: Workspace;
  setActiveWorkspace: (ws: Workspace) => void;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  can: (action: RbacAction) => boolean;
  isReadOnly: boolean;
  authHeaders: Record<string, string>;
}

const WorkspaceRoleContext = createContext<WorkspaceRoleContextType | undefined>(undefined);

export function WorkspaceRoleProvider({ children }: { children: ReactNode }) {
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace>(WORKSPACES[0]);
  const [activeRole, setActiveRoleState] = useState<UserRole>('owner');

  useEffect(() => {
    try {
      const savedWs = localStorage.getItem('__aegis_active_workspace__');
      if (savedWs) {
        const found = WORKSPACES.find((w) => w.id === savedWs);
        if (found) setActiveWorkspaceState(found);
      }
      const savedRole = localStorage.getItem('__aegis_active_role__') as UserRole | null;
      if (savedRole && ['owner', 'admin', 'developer', 'viewer'].includes(savedRole)) {
        setActiveRoleState(savedRole);
      }
    } catch {
      // ignore
    }
  }, []);

  const setActiveWorkspace = (ws: Workspace) => {
    setActiveWorkspaceState(ws);
    try {
      localStorage.setItem('__aegis_active_workspace__', ws.id);
    } catch {
      // ignore
    }
  };

  const setActiveRole = (role: UserRole) => {
    setActiveRoleState(role);
    try {
      localStorage.setItem('__aegis_active_role__', role);
    } catch {
      // ignore
    }
  };

  const can = (action: RbacAction): boolean => {
    return RbacService.can(activeRole, action);
  };

  const isReadOnly = activeRole === 'viewer';

  const authHeaders = {
    'x-aegis-role': activeRole,
    'x-aegis-workspace': activeWorkspace.id,
  };

  return (
    <WorkspaceRoleContext.Provider
      value={{
        activeWorkspace,
        setActiveWorkspace,
        activeRole,
        setActiveRole,
        can,
        isReadOnly,
        authHeaders,
      }}
    >
      {children}
    </WorkspaceRoleContext.Provider>
  );
}

export function useWorkspaceRole() {
  const context = useContext(WorkspaceRoleContext);
  if (!context) {
    throw new Error('useWorkspaceRole must be used within a WorkspaceRoleProvider');
  }
  return context;
}

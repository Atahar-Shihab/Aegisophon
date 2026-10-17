'use client';

import React, { useState } from 'react';
import { NavigationSidebar } from './NavigationSidebar';
import { TopHeader } from './TopHeader';
import { CommandPalette } from './CommandPalette';
import { WorkspaceRoleProvider } from '@/context/WorkspaceRoleContext';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <WorkspaceRoleProvider>
      <div className="flex min-h-screen bg-obsidian-bg text-obsidian-text-primary">
        {/* Sidebar Rail */}
        <NavigationSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          title={title}
          onOpenCommandPalette={() => setPaletteOpen(true)}
        />
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
    </WorkspaceRoleProvider>
  );
}

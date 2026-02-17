'use client';

import { ReactNode, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Panel } from '@/components/ui/panel';
import { Sidebar } from './sidebar';
import { StatusBar } from './status-bar';

interface DashboardShellProps {
  children: ReactNode;
  contentTitle?: string;
}

export function DashboardShell({ children, contentTitle }: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-tui-bg">
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:flex flex-col shrink-0 py-3 pl-3" style={{ width: 220 }}>
          <Panel title="≡ Menu" className="flex-1">
            <Sidebar />
          </Panel>
        </div>

        {/* Mobile sidebar overlay */}
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/70 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 flex flex-col p-3 md:hidden" style={{ width: 260 }}>
              <Panel title="≡ Menu" className="flex-1 relative">
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="absolute top-2 right-2 p-1 text-tui-dim hover:text-tui-fg"
                >
                  <X size={18} />
                </button>
                <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
              </Panel>
            </div>
          </>
        )}

        {/* Content area */}
        <div className="flex-1 flex flex-col overflow-hidden p-3">
          <Panel title={contentTitle} scrollable className="flex-1">
            <div className="md:hidden mb-4">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex items-center gap-2 border border-tui-border px-2 py-1 text-xs font-mono text-tui-dim hover:text-tui-fg"
              >
                <Menu size={16} />
                Menu
              </button>
            </div>
            {children}
          </Panel>
        </div>
      </div>

      {/* Status bar */}
      <div className="px-3 pb-3">
        <StatusBar
          rightContent={
            <>
              <a
                href="https://github.com/0xHoneyJar/loa-constructs"
                className="text-tui-dim hover:text-tui-fg text-xs font-mono no-underline"
              >
                GitHub
              </a>
              <span className="text-tui-dim text-xs font-mono">v1.5.0</span>
            </>
          }
        />
      </div>
    </div>
  );
}

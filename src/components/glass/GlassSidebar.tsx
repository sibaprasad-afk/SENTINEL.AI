import {
  ArrowLeft,
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  Database,
  FileSearch,
  History,
  Layers,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import React from 'react';
import type { ClinicianUser } from '../../types';
import { SentinelLogo } from '../SentinelLogo';

export type WorkspacePage =
  | 'command-center'
  | 'ai-copilot'
  | 'clinical-queue'
  | 'image-analysis'
  | 'dataset-analysis'
  | 'patient-intelligence'
  | 'analytics'
  | 'review-history'
  | 'notifications'
  | 'settings';

export const WORKSPACE_NAV_ITEMS: Array<{
  id: WorkspacePage;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'command-center', label: 'Command Center', Icon: LayoutDashboard },
  { id: 'ai-copilot', label: 'Clinical AI Studio', Icon: Sparkles },
  { id: 'clinical-queue', label: 'Clinical Queue', Icon: Layers },
  { id: 'image-analysis', label: 'Image Analysis', Icon: FileSearch },
  { id: 'dataset-analysis', label: 'Dataset Analysis', Icon: Database },
  { id: 'patient-intelligence', label: 'Patient Records', Icon: Users },
  { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
  { id: 'review-history', label: 'Review History', Icon: History },
  { id: 'notifications', label: 'Notifications', Icon: Bell },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

interface GlassSidebarProps {
  activePage: WorkspacePage;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate: (page: WorkspacePage) => void;
  unreadCount: number;
  user: ClinicianUser;
  onReturnToLanding: () => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const GlassSidebar: React.FC<GlassSidebarProps> = ({
  activePage,
  collapsed,
  onToggleCollapse,
  onNavigate,
  unreadCount,
  user,
  onReturnToLanding,
  onLogout,
  mobileOpen,
  onCloseMobile,
}) => {
  const renderNavContent = (isMobile = false) => {
    const isCollapsed = !isMobile && collapsed;
    return (
      <div className="flex h-full flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/10">
            <SentinelLogo compact={isCollapsed} />
            {isMobile ? (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close sidebar"
                className="rounded-lg p-1.5 text-[#A5B0C7] hover:bg-white/10 hover:text-[#F4F7FF]"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="rounded-lg border border-white/10 bg-[#090F1E]/70 p-1.5 text-[#A5B0C7] hover:border-[#19D6A0]/40 hover:text-[#19D6A0] transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5" />
                ) : (
                  <ChevronLeft className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>

          <nav className="mt-5 space-y-1.5">
            {WORKSPACE_NAV_ITEMS.map(({ id, label, Icon }) => {
              const active = activePage === id;
              const badgeCount = id === 'notifications' ? unreadCount : 0;
              return (
                <button
                  key={id}
                  type="button"
                  title={isCollapsed ? label : undefined}
                  onClick={() => onNavigate(id)}
                  className={`group relative w-full flex items-center ${
                    isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                  } py-2.5 rounded-xl text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                    active
                      ? 'bg-[#19D6A0]/15 text-[#19D6A0] border border-[#19D6A0]/40 shadow-[0_0_20px_-6px_rgba(25,214,160,0.55)]'
                      : 'text-[#A5B0C7] hover:text-[#F4F7FF] hover:bg-white/[0.05] border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        active ? 'text-[#19D6A0]' : 'text-[#77849E] group-hover:text-[#32D9E8]'
                      }`}
                    />
                    {!isCollapsed && <span className="truncate">{label}</span>}
                  </span>

                  {!isCollapsed && badgeCount > 0 && (
                    <span className="font-mono text-[11px] font-semibold text-[#FF647C] tabular-nums">
                      {badgeCount}
                    </span>
                  )}
                  {isCollapsed && badgeCount > 0 && (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#FF647C]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 pt-4 space-y-3">
          {!isCollapsed ? (
            <div className="rounded-xl border border-white/10 bg-[#090F1E]/75 p-3">
              <p className="text-xs font-semibold text-[#F4F7FF] truncate">{user.name}</p>
              <p className="text-[11px] text-[#32D9E8] truncate">{user.role}</p>
              <p className="text-[10px] text-[#77849E] truncate mt-0.5">{user.department}</p>
            </div>
          ) : (
            <div
              title={`${user.name} (${user.role})`}
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl border border-[#19D6A0]/30 bg-[#090F1E]/80 font-display text-xs font-bold text-[#19D6A0]"
            >
              {user.name
                .split(' ')
                .slice(0, 2)
                .map((p) => p[0])
                .join('')}
            </div>
          )}

          <div
            className={`flex ${
              isCollapsed ? 'flex-col items-center gap-2' : 'items-center justify-between gap-2'
            }`}
          >
            <button
              type="button"
              onClick={onReturnToLanding}
              title="Public Site"
              className="inline-flex items-center gap-1.5 text-xs text-[#A5B0C7] hover:text-[#32D9E8] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
              {!isCollapsed && <span>Public Site</span>}
            </button>
            <button
              type="button"
              onClick={onLogout}
              title="Sign Out"
              className="inline-flex items-center gap-1.5 text-xs text-[#A5B0C7] hover:text-[#FF647C] transition-colors"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Glass Sidebar */}
      <aside
        className={`hidden lg:flex shrink-0 flex-col border-r border-white/10 bg-[rgba(9,15,30,0.72)] backdrop-blur-2xl p-3.5 sticky top-0 h-screen transition-all duration-200 z-20 ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        {renderNavContent(false)}
      </aside>

      {/* Mobile Glass Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-[#050814]/80 backdrop-blur-sm" onClick={onCloseMobile} />
          <aside className="relative z-10 flex w-72 flex-col border-r border-white/12 bg-[rgba(9,15,30,0.92)] backdrop-blur-2xl p-4">
            {renderNavContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};

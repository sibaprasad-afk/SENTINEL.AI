import { Bell, Menu } from 'lucide-react';
import React from 'react';

interface GlassNavbarProps {
  breadcrumb: string;
  unreadNotifications: number;
  onOpenMobileSidebar: () => void;
  onOpenNotifications: () => void;
}

export const GlassNavbar: React.FC<GlassNavbarProps> = ({
  breadcrumb,
  unreadNotifications,
  onOpenMobileSidebar,
  onOpenNotifications,
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-white/10 bg-[rgba(9,15,30,0.68)] px-4 sm:px-6 lg:px-8 backdrop-blur-2xl">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open workspace navigation"
          className="lg:hidden rounded-xl border border-white/12 bg-[#090F1E]/80 p-2 text-[#F4F7FF]"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 text-xs text-[#A5B0C7] truncate">
          <span className="text-[#77849E]">SENTINEL Workspace</span>
          <span aria-hidden="true">/</span>
          <span className="font-medium text-[#F4F7FF]">{breadcrumb}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="hidden md:inline text-xs text-[#A5B0C7]">
          Decision-Support Interface · Human Oversight Required
        </span>
        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label="Notifications"
          className="relative rounded-xl border border-white/12 bg-[rgba(19,29,49,0.62)] p-2 text-[#A5B0C7] hover:border-[#32D9E8]/40 hover:text-[#F4F7FF] transition-colors"
        >
          <Bell className="h-4 w-4" />
          {unreadNotifications > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF647C] font-mono text-[10px] font-bold text-white">
              {unreadNotifications}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

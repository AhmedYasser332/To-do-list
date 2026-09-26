'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Sun,
  Inbox,
  Calendar,
  CalendarDays,
  CalendarRange,
  Settings,
  LogOut,
  Folder,
} from 'lucide-react';
import { signOut } from '@/app/(auth)/actions';
import { cn } from '@/lib/utils';
import { getAreaColor } from '@/domain/areas';
import type { AreaRow } from '@/types/domain';

interface DesktopSidebarProps {
  areas?: AreaRow[];
}

export function DesktopSidebar({ areas = [] }: DesktopSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeAreaId = searchParams.get('area');

  const navItems = [
    { label: 'Today', href: '/today', icon: Sun },
    { label: 'Inbox', href: '/inbox', icon: Inbox },
    { label: 'Week', href: '/week', icon: CalendarDays },
    { label: 'Month', href: '/month', icon: Calendar },
    { label: 'Year', href: '/year', icon: CalendarRange },
  ];

  return (
    <aside className="hidden md:flex w-56 flex-col justify-between border-r border-border-light bg-surface-light p-3 dark:border-border-dark dark:bg-[#202020] select-none shrink-0 h-screen sticky top-0">
      <div className="space-y-4">
        {/* Header / Brand */}
        <div className="px-2 py-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-mutedText-light dark:text-mutedText-dark">
            Planner
          </span>
        </div>

        {/* Primary Navigation */}
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href && !activeAreaId;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-[#EBF2F7] text-accent dark:bg-[#1E2D3D]'
                    : 'text-primaryText-light hover:bg-[#F2F2EE] dark:text-primaryText-dark dark:hover:bg-[#2A2A2A]'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Areas Section */}
        <div className="pt-2">
          <div className="px-2.5 pb-1 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-mutedText-light dark:text-mutedText-dark">
              Areas
            </span>
            <Link
              href="/settings"
              className="text-[11px] text-mutedText-light hover:text-accent dark:text-mutedText-dark"
            >
              Edit
            </Link>
          </div>

          <div className="space-y-0.5">
            {areas.length === 0 ? (
              <p className="px-2.5 py-1 text-[11px] text-mutedText-light/70 dark:text-mutedText-dark/70">
                No areas yet
              </p>
            ) : (
              areas.map((area) => {
                const isAreaActive = activeAreaId === area.id;
                return (
                  <Link
                    key={area.id}
                    href={`${pathname}?area=${area.id}`}
                    className={cn(
                      'flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors',
                      isAreaActive
                        ? 'bg-[#EBF2F7] text-accent dark:bg-[#1E2D3D]'
                        : 'text-primaryText-light hover:bg-[#F2F2EE] dark:text-primaryText-dark dark:hover:bg-[#2A2A2A]'
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: getAreaColor(area.color_token) }}
                    />
                    <span className="truncate">{area.name}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="pt-2 border-t border-border-light dark:border-border-dark space-y-0.5">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors',
            pathname === '/settings'
              ? 'bg-[#EBF2F7] text-accent dark:bg-[#1E2D3D]'
              : 'text-primaryText-light hover:bg-[#F2F2EE] dark:text-primaryText-dark dark:hover:bg-[#2A2A2A]'
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span>Settings</span>
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            data-testid="sign-out-btn"
            className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors dark:text-red-400 dark:hover:bg-red-950/20 text-left"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

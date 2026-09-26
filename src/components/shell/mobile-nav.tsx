'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, CalendarDays, Inbox, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Today', href: '/today', icon: Sun },
    { label: 'Plan', href: '/week', icon: CalendarDays },
    { label: 'Inbox', href: '/inbox', icon: Inbox },
    { label: 'More', href: '/settings', icon: MoreHorizontal },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border-light bg-surface-light px-2 py-1.5 shadow-md dark:border-border-dark dark:bg-surface-dark select-none">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href === '/week' && (pathname === '/month' || pathname === '/year'));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 rounded px-3 py-1 text-[11px] font-medium transition-colors',
              isActive
                ? 'text-accent'
                : 'text-mutedText-light hover:text-primaryText-light dark:text-mutedText-dark dark:hover:text-primaryText-dark'
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

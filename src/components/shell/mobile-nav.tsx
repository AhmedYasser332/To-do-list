'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sun,
  CalendarDays,
  Inbox,
  MoreHorizontal,
  Calendar,
  CalendarRange,
  Check,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();
  const [showPlanChooser, setShowPlanChooser] = useState(false);

  const isPlanActive =
    pathname === '/week' || pathname === '/month' || pathname === '/year';

  const planChoices = [
    {
      label: 'Week',
      href: '/week',
      icon: CalendarDays,
      description: 'Weekly outcomes and 7-day breakdown',
      testId: 'plan-nav-week',
    },
    {
      label: 'Month',
      href: '/month',
      icon: Calendar,
      description: 'Monthly milestones and constituent weeks',
      testId: 'plan-nav-month',
    },
    {
      label: 'Year',
      href: '/year',
      icon: CalendarRange,
      description: 'Annual vision and constituent months',
      testId: 'plan-nav-year',
    },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border-light bg-surface-light px-2 py-1.5 shadow-md dark:border-border-dark dark:bg-[#202020] select-none">
        {/* Today */}
        <Link
          href="/today"
          data-testid="mobile-today-tab"
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 rounded px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer',
            pathname === '/today'
              ? 'text-accent'
              : 'text-mutedText-light hover:text-primaryText-light dark:text-mutedText-dark dark:hover:text-primaryText-dark'
          )}
        >
          <Sun className="h-5 w-5" />
          <span>Today</span>
        </Link>

        {/* Plan - Opens Planning Chooser (T071) */}
        <button
          type="button"
          data-testid="mobile-plan-tab"
          onClick={() => setShowPlanChooser(true)}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 rounded px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer',
            isPlanActive
              ? 'text-accent'
              : 'text-mutedText-light hover:text-primaryText-light dark:text-mutedText-dark dark:hover:text-primaryText-dark'
          )}
        >
          <CalendarDays className="h-5 w-5" />
          <span>Plan</span>
        </button>

        {/* Inbox */}
        <Link
          href="/inbox"
          data-testid="mobile-inbox-tab"
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 rounded px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer',
            pathname === '/inbox'
              ? 'text-accent'
              : 'text-mutedText-light hover:text-primaryText-light dark:text-mutedText-dark dark:hover:text-primaryText-dark'
          )}
        >
          <Inbox className="h-5 w-5" />
          <span>Inbox</span>
        </Link>

        {/* More */}
        <Link
          href="/settings"
          data-testid="mobile-more-tab"
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 rounded px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer',
            pathname === '/settings'
              ? 'text-accent'
              : 'text-mutedText-light hover:text-primaryText-light dark:text-mutedText-dark dark:hover:text-primaryText-dark'
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>More</span>
        </Link>
      </nav>

      {/* Mobile Planning Chooser Bottom Sheet (T071) */}
      <Sheet open={showPlanChooser} onOpenChange={setShowPlanChooser}>
        <SheetContent
          side="bottom"
          data-testid="mobile-plan-chooser"
          className="p-4 pb-6 space-y-3"
        >
          <SheetHeader className="pb-1 text-left">
            <SheetTitle className="text-sm font-semibold">Planning Horizon</SheetTitle>
          </SheetHeader>

          <div className="space-y-1.5">
            {planChoices.map((choice) => {
              const Icon = choice.icon;
              const isActive = pathname === choice.href;

              return (
                <Link
                  key={choice.href}
                  href={choice.href}
                  data-testid={choice.testId}
                  onClick={() => setShowPlanChooser(false)}
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-md border transition-colors cursor-pointer',
                    isActive
                      ? 'border-accent/40 bg-selected text-accent dark:bg-[#1E2D3D]'
                      : 'border-border-light/60 bg-surface-light hover:bg-[#F5F5F0] text-primaryText-light dark:border-border-dark/60 dark:bg-surface-dark dark:text-primaryText-dark dark:hover:bg-[#252525]'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold">{choice.label}</div>
                      <div className="text-[11px] text-mutedText-light dark:text-mutedText-dark font-normal">
                        {choice.description}
                      </div>
                    </div>
                  </div>
                  {isActive && <Check className="h-4 w-4 shrink-0 text-accent" />}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

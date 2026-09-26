import * as React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { QuickAdd } from '@/components/planner/quick-add';
import { ItemTree } from '@/components/planner/item-tree';
import { AreaFilter } from '@/components/planner/area-filter';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import {
  getWeekBoundaries,
  formatDate,
  addWeeks,
  parseDate,
} from '@/domain/calendar';
import { buildTree, filterTreeByArea } from '@/domain/hierarchy';
import type { ItemRow, AreaRow, WeekDay } from '@/types/domain';

interface WeekPageProps {
  searchParams: Promise<{ date?: string; area?: string }>;
}

export default async function WeekPage({ searchParams }: WeekPageProps) {
  const resolvedParams = await searchParams;
  const activeAreaId = resolvedParams.area;
  const rawDate = resolvedParams.date || formatDate(new Date());

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();

  if (authError || !claimsData?.claims?.sub) {
    redirect('/login');
  }

  const userId = claimsData.claims.sub as string;

  // Single user-scoped load
  const { data: allItemsData } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  const { data: areasData } = await supabase
    .from('areas')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  const { data: prefsData } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const allItems: ItemRow[] = allItemsData || [];
  const areas: AreaRow[] = areasData || [];
  const firstDayOfWeek: WeekDay = prefsData?.first_day_of_week || 'monday';

  const { start: weekStart, end: weekEnd } = getWeekBoundaries(rawDate, firstDayOfWeek);
  const prevWeekDate = addWeeks(rawDate, -1);
  const nextWeekDate = addWeeks(rawDate, 1);

  // 1. Primary Week Items
  const weekItems = allItems.filter(
    (item) =>
      item.horizon === 'week' &&
      item.period_start === weekStart &&
      item.period_end === weekEnd
  );

  let weekTree = buildTree(weekItems);
  if (activeAreaId) {
    weekTree = filterTreeByArea(weekTree, activeAreaId);
  }

  // 2. Day Breakdown: 7 calendar days within this week
  const startDate = parseDate(weekStart);
  const daysInWeek: { dateStr: string; label: string; items: ItemRow[] }[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateStr = formatDate(d);
    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    let dayItems = allItems.filter(
      (item) => item.horizon === 'day' && item.period_start === dateStr
    );
    if (activeAreaId) {
      dayItems = dayItems.filter((item) => item.area_id === activeAreaId);
    }

    daysInWeek.push({
      dateStr,
      label,
      items: dayItems,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header & Period Navigation */}
      <div className="flex flex-col gap-2 border-b border-border-light pb-4 dark:border-border-dark sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primaryText-light dark:text-primaryText-dark flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-accent" />
            <span>Week</span>
          </h1>
          <p className="text-xs text-mutedText-light dark:text-mutedText-dark">
            {weekStart} &ndash; {weekEnd}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded border border-border-light bg-surface-light shadow-sm dark:border-border-dark dark:bg-surface-dark">
            <Link
              href={`/week?date=${prevWeekDate}${activeAreaId ? `&area=${activeAreaId}` : ''}`}
              data-testid="prev-period-btn"
              className="p-1.5 hover:bg-[#F2F2EE] text-primaryText-light dark:hover:bg-[#2A2A2A] transition-colors"
              title="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href={`/week?date=${formatDate(new Date())}${activeAreaId ? `&area=${activeAreaId}` : ''}`}
              className="px-2 py-1 text-xs font-medium text-mutedText-light hover:text-primaryText-light"
            >
              This Week
            </Link>
            <Link
              href={`/week?date=${nextWeekDate}${activeAreaId ? `&area=${activeAreaId}` : ''}`}
              data-testid="next-period-btn"
              className="p-1.5 hover:bg-[#F2F2EE] text-primaryText-light dark:hover:bg-[#2A2A2A] transition-colors"
              title="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <AreaFilter areas={areas} activeAreaId={activeAreaId} />
        </div>
      </div>

      {/* Week Quick Add */}
      <div>
        <QuickAdd
          defaultHorizon="week"
          defaultPeriodStart={weekStart}
          defaultPeriodEnd={weekEnd}
          defaultAreaId={activeAreaId || null}
          placeholder="Add an outcome or goal for this week..."
        />
      </div>

      {/* Primary Week Goals / Items */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-mutedText-light dark:text-mutedText-dark">
          Weekly Outcomes ({weekItems.length})
        </h2>
        {weekTree.length === 0 ? (
          <p className="text-xs text-mutedText-light/70 dark:text-mutedText-dark/70 italic px-2 py-1">
            No weekly outcomes set for this week
          </p>
        ) : (
          <ItemTree nodes={weekTree} areas={areas} />
        )}
      </section>

      {/* Daily Breakdown */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-mutedText-light dark:text-mutedText-dark">
          Day Breakdown
        </h2>
        <div className="space-y-3">
          {daysInWeek.map((day) => {
            const dayTree = buildTree(day.items);
            return (
              <div
                key={day.dateStr}
                className="rounded border border-border-light bg-surface-light p-3 dark:border-border-dark dark:bg-surface-dark space-y-2 shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-border-light/40 pb-1.5 dark:border-border-dark/40">
                  <span className="text-xs font-medium text-primaryText-light dark:text-primaryText-dark">
                    {day.label}
                  </span>
                  <span className="text-[11px] text-mutedText-light dark:text-mutedText-dark">
                    {day.items.length} {day.items.length === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
                {dayTree.length === 0 ? (
                  <p className="text-[11px] text-mutedText-light/60 dark:text-mutedText-dark/60 italic py-0.5">
                    No scheduled tasks
                  </p>
                ) : (
                  <ItemTree nodes={dayTree} areas={areas} />
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

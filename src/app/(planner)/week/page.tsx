import * as React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { QuickAdd } from '@/components/planner/quick-add';
import { ItemTree } from '@/components/planner/item-tree';
import { AreaFilter } from '@/components/planner/area-filter';
import { DayQuickAdd } from '@/components/planner/day-quick-add';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import {
  getWeekBoundaries,
  formatDate,
  addWeeks,
  parseDate,
  getTodayDate,
} from '@/domain/calendar';
import { buildTree, projectTreeForView, filterTreeByArea } from '@/domain/hierarchy';
import type { ItemRow, AreaRow, WeekDay, ItemNode } from '@/types/domain';

interface WeekPageProps {
  searchParams: Promise<{ date?: string; area?: string }>;
}

export default async function WeekPage({ searchParams }: WeekPageProps) {
  const resolvedParams = await searchParams;
  const activeAreaId = resolvedParams.area;
  const rawDate = resolvedParams.date || getTodayDate();

  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();

  if (authError || !claimsData?.claims?.sub) {
    redirect('/login');
  }

  const userId = claimsData.claims.sub as string;

  // Single parallel fetch for items, areas, and preferences (T087)
  const [{ data: allItemsData }, { data: areasData }, { data: prefsData }] =
    await Promise.all([
      supabase
        .from('items')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('areas')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('user_preferences')
        .select('first_day_of_week')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

  const allItems: ItemRow[] = allItemsData || [];
  const areas: AreaRow[] = areasData || [];
  const firstDayOfWeek: WeekDay = prefsData?.first_day_of_week || 'monday';

  const { start: weekStart, end: weekEnd } = getWeekBoundaries(rawDate, firstDayOfWeek);
  const prevWeekDate = addWeeks(rawDate, -1);
  const nextWeekDate = addWeeks(rawDate, 1);

  // 1. Build complete hierarchy and calculate progress across full tree (T069)
  const fullTree = buildTree(allItems);

  // 2. Project for primary Week Items
  let weekTree = projectTreeForView(
    fullTree,
    (item) =>
      item.horizon === 'week' &&
      item.period_start === weekStart &&
      item.period_end === weekEnd
  );

  if (activeAreaId) {
    weekTree = filterTreeByArea(weekTree, activeAreaId);
  }

  const primaryWeekCount = allItems.filter(
    (i) =>
      i.horizon === 'week' &&
      i.period_start === weekStart &&
      i.period_end === weekEnd
  ).length;

  // 3. Day Breakdown: 7 calendar days within this week
  const startDate = parseDate(weekStart);
  const daysInWeek: { dateStr: string; label: string; tree: ItemNode[]; rawCount: number }[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateStr = formatDate(d);
    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    let dayNodes = projectTreeForView(
      fullTree,
      (item) => item.horizon === 'day' && item.period_start === dateStr
    );

    if (activeAreaId) {
      dayNodes = filterTreeByArea(dayNodes, activeAreaId);
    }

    const rawCount = allItems.filter(
      (item) => item.horizon === 'day' && item.period_start === dateStr && (!activeAreaId || item.area_id === activeAreaId)
    ).length;

    daysInWeek.push({
      dateStr,
      label,
      tree: dayNodes,
      rawCount,
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
              className="p-1.5 hover:bg-[#F2F2EE] text-primaryText-light dark:hover:bg-[#2A2A2A] dark:text-primaryText-dark transition-colors"
              title="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href={`/week?date=${getTodayDate()}${activeAreaId ? `&area=${activeAreaId}` : ''}`}
              className="px-2 py-1 text-xs font-medium text-mutedText-light hover:text-primaryText-light dark:text-mutedText-dark dark:hover:text-primaryText-dark"
            >
              This Week
            </Link>
            <Link
              href={`/week?date=${nextWeekDate}${activeAreaId ? `&area=${activeAreaId}` : ''}`}
              data-testid="next-period-btn"
              className="p-1.5 hover:bg-[#F2F2EE] text-primaryText-light dark:hover:bg-[#2A2A2A] dark:text-primaryText-dark transition-colors"
              title="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <AreaFilter areas={areas} activeAreaId={activeAreaId} />
        </div>
      </div>

      {/* Week Quick Add (T073) */}
      <div>
        <QuickAdd
          defaultHorizon="week"
          defaultPeriodStart={weekStart}
          defaultPeriodEnd={weekEnd}
          defaultAreaId={activeAreaId || null}
          areas={areas}
          candidateParents={allItems}
          placeholder="Add an outcome or goal for this week..."
        />
      </div>

      {/* Primary Week Goals / Items */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-mutedText-light dark:text-mutedText-dark">
          Weekly Outcomes ({primaryWeekCount})
        </h2>
        {weekTree.length === 0 ? (
          <p className="text-xs text-mutedText-light/70 dark:text-mutedText-dark/70 italic px-2 py-1">
            No weekly outcomes set for this week
          </p>
        ) : (
          <ItemTree
            nodes={weekTree}
            allItems={allItems}
            areas={areas}
            firstDayOfWeek={firstDayOfWeek}
          />
        )}
      </section>

      {/* Daily Breakdown with Direct Task Creation (T074) */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-mutedText-light dark:text-mutedText-dark">
          Day Breakdown
        </h2>
        <div className="space-y-3">
          {daysInWeek.map((day) => (
            <div
              key={day.dateStr}
              className="rounded border border-border-light bg-surface-light p-3 dark:border-border-dark dark:bg-surface-dark space-y-2 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-border-light/40 pb-1.5 dark:border-border-dark/40">
                <span className="text-xs font-medium text-primaryText-light dark:text-primaryText-dark">
                  {day.label}
                </span>
                <span className="text-[11px] text-mutedText-light dark:text-mutedText-dark">
                  {day.rawCount} {day.rawCount === 1 ? 'task' : 'tasks'}
                </span>
              </div>
              {day.tree.length === 0 ? (
                <p className="text-[11px] text-mutedText-light/60 dark:text-mutedText-dark/60 italic py-0.5">
                  No scheduled tasks
                </p>
              ) : (
                <ItemTree
                  nodes={day.tree}
                  allItems={allItems}
                  areas={areas}
                  firstDayOfWeek={firstDayOfWeek}
                />
              )}
              {/* Direct Day Task Creation (T074) */}
              <DayQuickAdd
                dateStr={day.dateStr}
                dayLabel={day.label}
                areas={areas}
                candidateParents={allItems}
                defaultAreaId={activeAreaId || null}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

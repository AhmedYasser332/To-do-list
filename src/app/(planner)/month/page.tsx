import * as React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { QuickAdd } from '@/components/planner/quick-add';
import { ItemTree } from '@/components/planner/item-tree';
import { AreaFilter } from '@/components/planner/area-filter';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import {
  getMonthBoundaries,
  getWeekBoundaries,
  parseDate,
  getTodayDate,
} from '@/domain/calendar';
import { buildTree, projectTreeForView, filterTreeByArea } from '@/domain/hierarchy';
import type { ItemRow, AreaRow, WeekDay, ItemNode } from '@/types/domain';

interface MonthPageProps {
  searchParams: Promise<{ month?: string; area?: string }>;
}

export default async function MonthPage({ searchParams }: MonthPageProps) {
  const resolvedParams = await searchParams;
  const activeAreaId = resolvedParams.area;

  const now = new Date();
  const defaultYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const yearMonth = resolvedParams.month || defaultYearMonth;
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

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

  const { start: monthStart, end: monthEnd } = getMonthBoundaries(year, month);

  // Next / Previous month query strings
  const prevDate = new Date(year, month - 2, 1);
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const nextDate = new Date(year, month, 1);
  const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

  // 1. Build complete hierarchy and calculate progress across full tree (T069)
  const fullTree = buildTree(allItems);

  // 2. Project for primary Month Items
  let tree = projectTreeForView(
    fullTree,
    (item) =>
      item.horizon === 'month' &&
      item.period_start === monthStart &&
      item.period_end === monthEnd
  );

  if (activeAreaId) {
    tree = filterTreeByArea(tree, activeAreaId);
  }

  const monthItemsCount = allItems.filter(
    (item) =>
      item.horizon === 'month' &&
      item.period_start === monthStart &&
      item.period_end === monthEnd &&
      (!activeAreaId || item.area_id === activeAreaId)
  ).length;

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // 3. Constituent Weeks Breakdown (T077)
  const constituentWeeks: { weekStart: string; weekEnd: string; items: ItemNode[] }[] = [];
  const currentCursor = parseDate(monthStart);
  const endCursor = parseDate(monthEnd);
  const seenWeeks = new Set<string>();

  while (currentCursor <= endCursor) {
    const { start: wStart, end: wEnd } = getWeekBoundaries(currentCursor, firstDayOfWeek);
    if (!seenWeeks.has(wStart)) {
      seenWeeks.add(wStart);
      const weekNodes = projectTreeForView(
        fullTree,
        (i) => i.horizon === 'week' && i.period_start === wStart && i.period_end === wEnd
      );
      constituentWeeks.push({
        weekStart: wStart,
        weekEnd: wEnd,
        items: weekNodes,
      });
    }
    currentCursor.setDate(currentCursor.getDate() + 7);
  }

  return (
    <div className="space-y-6">
      {/* Header & Navigation */}
      <div className="flex flex-col gap-2 border-b border-border-light pb-4 dark:border-border-dark sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primaryText-light dark:text-primaryText-dark flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent" />
            <span>Month</span>
          </h1>
          <p className="text-xs text-mutedText-light dark:text-mutedText-dark">
            {monthLabel} ({monthStart} &ndash; {monthEnd})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded border border-border-light bg-surface-light shadow-sm dark:border-border-dark dark:bg-surface-dark">
            <Link
              href={`/month?month=${prevMonthStr}${activeAreaId ? `&area=${activeAreaId}` : ''}`}
              data-testid="prev-period-btn"
              className="p-1.5 hover:bg-[#F2F2EE] text-primaryText-light dark:hover:bg-[#2A2A2A] dark:text-primaryText-dark transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href={`/month?month=${defaultYearMonth}${activeAreaId ? `&area=${activeAreaId}` : ''}`}
              className="px-2 py-1 text-xs font-medium text-mutedText-light hover:text-primaryText-light dark:text-mutedText-dark dark:hover:text-primaryText-dark"
            >
              This Month
            </Link>
            <Link
              href={`/month?month=${nextMonthStr}${activeAreaId ? `&area=${activeAreaId}` : ''}`}
              data-testid="next-period-btn"
              className="p-1.5 hover:bg-[#F2F2EE] text-primaryText-light dark:hover:bg-[#2A2A2A] dark:text-primaryText-dark transition-colors"
              title="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <AreaFilter areas={areas} activeAreaId={activeAreaId} />
        </div>
      </div>

      {/* Month Quick Add (T073) */}
      <div>
        <QuickAdd
          defaultHorizon="month"
          defaultPeriodStart={monthStart}
          defaultPeriodEnd={monthEnd}
          defaultAreaId={activeAreaId || null}
          areas={areas}
          candidateParents={allItems}
          placeholder="Add a monthly milestone or project..."
        />
      </div>

      {/* Primary Month Items */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-mutedText-light dark:text-mutedText-dark">
          Monthly Outcomes ({monthItemsCount})
        </h2>
        {tree.length === 0 ? (
          <div className="rounded border border-dashed border-border-light p-8 text-center dark:border-border-dark">
            <p className="text-xs text-mutedText-light dark:text-mutedText-dark">
              No items planned for {monthLabel}. Use Quick Add above to add your monthly objectives.
            </p>
          </div>
        ) : (
          <ItemTree
            nodes={tree}
            allItems={allItems}
            areas={areas}
            firstDayOfWeek={firstDayOfWeek}
          />
        )}
      </section>

      {/* Constituent Weeks Breakdown (T077) */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-mutedText-light dark:text-mutedText-dark">
          Constituent Weeks
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {constituentWeeks.map((cw) => (
            <Link
              key={cw.weekStart}
              href={`/week?date=${cw.weekStart}${activeAreaId ? `&area=${activeAreaId}` : ''}`}
              className="rounded border border-border-light bg-surface-light p-3 dark:border-border-dark dark:bg-surface-dark hover:border-accent/50 dark:hover:border-accent/50 transition-colors shadow-xs group"
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-border-light/40 dark:border-border-dark/40">
                <span className="text-xs font-medium text-primaryText-light group-hover:text-accent dark:text-primaryText-dark dark:group-hover:text-accent transition-colors">
                  {cw.weekStart} &ndash; {cw.weekEnd}
                </span>
                <span className="text-[11px] text-mutedText-light dark:text-mutedText-dark">
                  {cw.items.length} {cw.items.length === 1 ? 'outcome' : 'outcomes'}
                </span>
              </div>
              <div className="pt-1.5 space-y-1">
                {cw.items.length === 0 ? (
                  <p className="text-[11px] text-mutedText-light/60 dark:text-mutedText-dark/60 italic">
                    No weekly goals set &rarr;
                  </p>
                ) : (
                  cw.items.slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      className="text-xs flex items-center justify-between text-mutedText-light dark:text-mutedText-dark"
                    >
                      <span className="truncate flex-1">&bull; {item.title}</span>
                      <span className="text-[10px] font-mono ml-2">
                        {Math.round(item.progress || 0)}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

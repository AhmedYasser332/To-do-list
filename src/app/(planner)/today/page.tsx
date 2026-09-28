import * as React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { QuickAdd } from '@/components/planner/quick-add';
import { ItemTree } from '@/components/planner/item-tree';
import { AreaFilter } from '@/components/planner/area-filter';
import { Calendar, Sun, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  buildTree,
  projectTreeForView,
  filterTreeByArea,
} from '@/domain/hierarchy';
import {
  getTodayDate,
  getWeekBoundaries,
  getMonthBoundaries,
  getYearBoundaries,
} from '@/domain/calendar';
import type { ItemRow as ItemRowType, AreaRow, WeekDay, ItemNode } from '@/types/domain';

export const dynamic = 'force-dynamic';

interface TodayPageProps {
  searchParams: Promise<{ area?: string }>;
}

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const resolvedParams = await searchParams;
  const activeAreaId = resolvedParams.area;

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

  const allItems: ItemRowType[] = allItemsData || [];
  const areas: AreaRow[] = areasData || [];
  const firstDayOfWeek: WeekDay = prefsData?.first_day_of_week || 'monday';

  // 1. Build complete hierarchy and calculate progress across full tree (T069)
  const fullTree = buildTree(allItems);

  // 2. Today's local date (T084)
  const todayDateStr = getTodayDate();

  // 3. Project already-computed tree into Today's Day items (T069)
  const todayNodes = projectTreeForView(
    fullTree,
    (item) => item.horizon === 'day' && item.period_start === todayDateStr
  );

  // Partition into Timed and Anytime
  let timedTree = todayNodes
    .filter((item) => Boolean(item.time))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  let anytimeTree = todayNodes.filter((item) => !item.time);

  if (activeAreaId) {
    timedTree = filterTreeByArea(timedTree, activeAreaId);
    anytimeTree = filterTreeByArea(anytimeTree, activeAreaId);
  }

  // Calculate compact completion summary for Today's Day items
  function collectDayItems(nodes: ItemNode[]): ItemNode[] {
    const list: ItemNode[] = [];
    for (const node of nodes) {
      if (!(node as any).isContextRow && node.horizon === 'day' && node.period_start === todayDateStr) {
        list.push(node);
      }
      if (node.children && node.children.length > 0) {
        list.push(...collectDayItems(node.children));
      }
    }
    return list;
  }

  const activeTodayNodes = [...timedTree, ...anytimeTree];
  const allTodayDayItems = collectDayItems(activeTodayNodes);
  const totalTodayCount = allTodayDayItems.length;
  const completedTodayCount = allTodayDayItems.filter((i) => i.status === 'complete').length;
  const todayProgressPercent =
    totalTodayCount > 0
      ? Math.round(
          allTodayDayItems.reduce(
            (acc, i) => acc + (i.progress ?? (i.status === 'complete' ? 100 : 0)),
            0
          ) / totalTodayCount
        )
      : 0;

  // 4. Relevant current Week, Month, and Year context items (search full hierarchy + Area filtered)
  const { start: weekStart, end: weekEnd } = getWeekBoundaries(todayDateStr, firstDayOfWeek);
  const now = new Date();
  const { start: monthStart, end: monthEnd } = getMonthBoundaries(
    now.getFullYear(),
    now.getMonth() + 1
  );
  const { start: yearStart, end: yearEnd } = getYearBoundaries(now.getFullYear());

  let currentWeekItems = projectTreeForView(
    fullTree,
    (i) =>
      i.horizon === 'week' &&
      i.period_start === weekStart &&
      i.period_end === weekEnd
  );
  let currentMonthItems = projectTreeForView(
    fullTree,
    (i) =>
      i.horizon === 'month' &&
      i.period_start === monthStart &&
      i.period_end === monthEnd
  );
  let currentYearItems = projectTreeForView(
    fullTree,
    (i) =>
      i.horizon === 'year' &&
      i.period_start === yearStart &&
      i.period_end === yearEnd
  );

  if (activeAreaId) {
    currentWeekItems = filterTreeByArea(currentWeekItems, activeAreaId);
    currentMonthItems = filterTreeByArea(currentMonthItems, activeAreaId);
    currentYearItems = filterTreeByArea(currentYearItems, activeAreaId);
  }

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-border-light pb-4 dark:border-border-dark sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primaryText-light dark:text-primaryText-dark flex items-center gap-2">
            <Sun className="h-5 w-5 text-amber-500" />
            <span>Today</span>
          </h1>
          <div className="flex items-center gap-2 text-xs text-mutedText-light dark:text-mutedText-dark">
            <span>{todayFormatted}</span>
            {totalTodayCount > 0 && (
              <>
                <span>&bull;</span>
                <span
                  data-testid="today-completion-summary"
                  className="font-medium text-primaryText-light dark:text-primaryText-dark"
                >
                  {completedTodayCount} of {totalTodayCount} completed ({todayProgressPercent}%)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Area Filter Control */}
        <AreaFilter areas={areas} activeAreaId={activeAreaId} />
      </div>

      {/* Quick Add with Progressive Controls (T073) */}
      <div className="pt-1">
        <QuickAdd
          defaultHorizon="day"
          defaultPeriodStart={todayDateStr}
          defaultPeriodEnd={todayDateStr}
          defaultAreaId={activeAreaId || null}
          areas={areas}
          candidateParents={allItems}
          placeholder="Add a task for Today (+ Time for specific hour)..."
        />
      </div>

      {/* Timed Section */}
      <section data-testid="timed-section" className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-mutedText-light dark:text-mutedText-dark">
          <Clock className="h-3.5 w-3.5" />
          <span>Timed ({timedTree.length})</span>
        </div>
        {timedTree.length === 0 ? (
          <p className="text-xs text-mutedText-light/70 dark:text-mutedText-dark/70 italic px-2 py-1">
            No timed tasks scheduled
          </p>
        ) : (
          <ItemTree
            nodes={timedTree}
            allItems={allItems}
            areas={areas}
            firstDayOfWeek={firstDayOfWeek}
          />
        )}
      </section>

      {/* Anytime Section */}
      <section data-testid="anytime-section" className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-mutedText-light dark:text-mutedText-dark">
          <Calendar className="h-3.5 w-3.5" />
          <span>Anytime ({anytimeTree.length})</span>
        </div>
        {anytimeTree.length === 0 ? (
          <p className="text-xs text-mutedText-light/70 dark:text-mutedText-dark/70 italic px-2 py-1">
            No anytime tasks for today
          </p>
        ) : (
          <ItemTree
            nodes={anytimeTree}
            allItems={allItems}
            areas={areas}
            firstDayOfWeek={firstDayOfWeek}
          />
        )}
      </section>

      {/* Compact Context Area (Only Relevant Current Week, Month, and Year items) (T078) */}
      {(currentWeekItems.length > 0 || currentMonthItems.length > 0 || currentYearItems.length > 0) && (
        <section className="pt-4 border-t border-border-light/60 dark:border-border-dark/60 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-mutedText-light dark:text-mutedText-dark">
            Planning Context
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Week Context */}
            <div className="rounded border border-border-light bg-surface-light p-2.5 dark:border-border-dark dark:bg-surface-dark">
              <span className="text-[11px] font-medium text-mutedText-light dark:text-mutedText-dark block mb-1">
                This Week ({currentWeekItems.length})
              </span>
              <div className="space-y-1">
                {currentWeekItems.length === 0 ? (
                  <p className="text-xs italic text-mutedText-light/70 dark:text-mutedText-dark/70">
                    No weekly items
                  </p>
                ) : (
                  currentWeekItems.slice(0, 3).map((w) => (
                    <div
                      key={w.id}
                      className="text-xs flex items-center justify-between text-primaryText-light dark:text-primaryText-dark"
                    >
                      <span className="truncate flex-1">• {w.title}</span>
                      <span className="text-[10px] font-mono text-mutedText-light dark:text-mutedText-dark ml-2">
                        {Math.round(w.progress || 0)}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Month Context */}
            <div className="rounded border border-border-light bg-surface-light p-2.5 dark:border-border-dark dark:bg-surface-dark">
              <span className="text-[11px] font-medium text-mutedText-light dark:text-mutedText-dark block mb-1">
                This Month ({currentMonthItems.length})
              </span>
              <div className="space-y-1">
                {currentMonthItems.length === 0 ? (
                  <p className="text-xs italic text-mutedText-light/70 dark:text-mutedText-dark/70">
                    No monthly items
                  </p>
                ) : (
                  currentMonthItems.slice(0, 3).map((m) => (
                    <div
                      key={m.id}
                      className="text-xs flex items-center justify-between text-primaryText-light dark:text-primaryText-dark"
                    >
                      <span className="truncate flex-1">• {m.title}</span>
                      <span className="text-[10px] font-mono text-mutedText-light dark:text-mutedText-dark ml-2">
                        {Math.round(m.progress || 0)}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Year Context */}
            <div className="rounded border border-border-light bg-surface-light p-2.5 dark:border-border-dark dark:bg-surface-dark">
              <span className="text-[11px] font-medium text-mutedText-light dark:text-mutedText-dark block mb-1">
                This Year ({currentYearItems.length})
              </span>
              <div className="space-y-1">
                {currentYearItems.length === 0 ? (
                  <p className="text-xs italic text-mutedText-light/70 dark:text-mutedText-dark/70">
                    No yearly items
                  </p>
                ) : (
                  currentYearItems.slice(0, 3).map((y) => (
                    <div
                      key={y.id}
                      className="text-xs flex items-center justify-between text-primaryText-light dark:text-primaryText-dark"
                    >
                      <span className="truncate flex-1">• {y.title}</span>
                      <span className="text-[10px] font-mono text-mutedText-light dark:text-mutedText-dark ml-2">
                        {Math.round(y.progress || 0)}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

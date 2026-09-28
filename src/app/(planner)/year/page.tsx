import * as React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { QuickAdd } from '@/components/planner/quick-add';
import { ItemTree } from '@/components/planner/item-tree';
import { AreaFilter } from '@/components/planner/area-filter';
import { ChevronLeft, ChevronRight, CalendarRange } from 'lucide-react';
import { getYearBoundaries, getMonthBoundaries } from '@/domain/calendar';
import { buildTree, projectTreeForView, filterTreeByArea } from '@/domain/hierarchy';
import type { ItemRow, AreaRow, WeekDay, ItemNode } from '@/types/domain';

interface YearPageProps {
  searchParams: Promise<{ year?: string; area?: string }>;
}

export default async function YearPage({ searchParams }: YearPageProps) {
  const resolvedParams = await searchParams;
  const activeAreaId = resolvedParams.area;

  const currentYear = new Date().getFullYear();
  const year = resolvedParams.year ? parseInt(resolvedParams.year, 10) : currentYear;

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

  const { start: yearStart, end: yearEnd } = getYearBoundaries(year);

  // 1. Build complete hierarchy and calculate progress across full tree (T069)
  const fullTree = buildTree(allItems);

  // 2. Project for primary Year Items
  let tree = projectTreeForView(
    fullTree,
    (item) =>
      item.horizon === 'year' &&
      item.period_start === yearStart &&
      item.period_end === yearEnd
  );

  if (activeAreaId) {
    tree = filterTreeByArea(tree, activeAreaId);
  }

  const yearItemsCount = allItems.filter(
    (item) =>
      item.horizon === 'year' &&
      item.period_start === yearStart &&
      item.period_end === yearEnd &&
      (!activeAreaId || item.area_id === activeAreaId)
  ).length;

  // 3. Constituent Months Breakdown (T077)
  const constituentMonths: { monthStr: string; label: string; items: ItemNode[] }[] = [];
  for (let m = 1; m <= 12; m++) {
    const monthStr = `${year}-${String(m).padStart(2, '0')}`;
    const { start: mStart, end: mEnd } = getMonthBoundaries(year, m);
    let mNodes = projectTreeForView(
      fullTree,
      (i) => i.horizon === 'month' && i.period_start === mStart && i.period_end === mEnd
    );
    if (activeAreaId) {
      mNodes = filterTreeByArea(mNodes, activeAreaId);
    }
    const label = new Date(year, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });
    constituentMonths.push({
      monthStr,
      label,
      items: mNodes,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header & Navigation */}
      <div className="flex flex-col gap-2 border-b border-border-light pb-4 dark:border-border-dark sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primaryText-light dark:text-primaryText-dark flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-accent" />
            <span>Year {year}</span>
          </h1>
          <p className="text-xs text-mutedText-light dark:text-mutedText-dark">
            Annual vision, key objectives, and high-altitude goals ({yearStart} &ndash; {yearEnd})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center rounded border border-border-light bg-surface-light shadow-sm dark:border-border-dark dark:bg-surface-dark">
            <Link
              href={`/year?year=${year - 1}${activeAreaId ? `&area=${activeAreaId}` : ''}`}
              data-testid="prev-period-btn"
              className="p-1.5 hover:bg-[#F2F2EE] text-primaryText-light dark:hover:bg-[#2A2A2A] dark:text-primaryText-dark transition-colors"
              title="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href={`/year?year=${currentYear}${activeAreaId ? `&area=${activeAreaId}` : ''}`}
              className="px-2 py-1 text-xs font-medium text-mutedText-light hover:text-primaryText-light dark:text-mutedText-dark dark:hover:text-primaryText-dark"
            >
              {currentYear}
            </Link>
            <Link
              href={`/year?year=${year + 1}${activeAreaId ? `&area=${activeAreaId}` : ''}`}
              data-testid="next-period-btn"
              className="p-1.5 hover:bg-[#F2F2EE] text-primaryText-light dark:hover:bg-[#2A2A2A] dark:text-primaryText-dark transition-colors"
              title="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <AreaFilter areas={areas} activeAreaId={activeAreaId} />
        </div>
      </div>

      {/* Year Quick Add (T073) */}
      <div>
        <QuickAdd
          defaultHorizon="year"
          defaultPeriodStart={yearStart}
          defaultPeriodEnd={yearEnd}
          defaultAreaId={activeAreaId || null}
          areas={areas}
          candidateParents={allItems}
          placeholder="Add an annual goal or high-level focus..."
        />
      </div>

      {/* Primary Year Items */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-mutedText-light dark:text-mutedText-dark">
          Annual Goals ({yearItemsCount})
        </h2>
        {tree.length === 0 ? (
          <div className="rounded border border-dashed border-border-light p-8 text-center dark:border-border-dark">
            <p className="text-xs text-mutedText-light dark:text-mutedText-dark">
              No yearly goals established for {year}. Capture high-level objectives above.
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

      {/* Constituent Months Breakdown (T077) */}
      <section className="space-y-3 pt-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-mutedText-light dark:text-mutedText-dark">
          Constituent Months
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {constituentMonths.map((cm) => (
            <Link
              key={cm.monthStr}
              href={`/month?month=${cm.monthStr}${activeAreaId ? `&area=${activeAreaId}` : ''}`}
              className="rounded border border-border-light bg-surface-light p-2.5 dark:border-border-dark dark:bg-surface-dark hover:border-accent/50 dark:hover:border-accent/50 transition-colors shadow-xs group"
            >
              <div className="flex items-center justify-between pb-1 border-b border-border-light/40 dark:border-border-dark/40">
                <span className="text-xs font-medium text-primaryText-light group-hover:text-accent dark:text-primaryText-dark dark:group-hover:text-accent transition-colors">
                  {cm.label}
                </span>
                <span className="text-[10px] text-mutedText-light dark:text-mutedText-dark">
                  {cm.items.length} {cm.items.length === 1 ? 'goal' : 'goals'}
                </span>
              </div>
              <div className="pt-1 space-y-0.5">
                {cm.items.length === 0 ? (
                  <p className="text-[10px] text-mutedText-light/60 dark:text-mutedText-dark/60 italic">
                    None &rarr;
                  </p>
                ) : (
                  cm.items.slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      className="text-[11px] flex items-center justify-between text-mutedText-light dark:text-mutedText-dark"
                    >
                      <span className="truncate flex-1">&bull; {item.title}</span>
                      <span className="text-[10px] font-mono ml-1.5 shrink-0">
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

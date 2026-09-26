import * as React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { QuickAdd } from '@/components/planner/quick-add';
import { ItemTree } from '@/components/planner/item-tree';
import { AreaFilter } from '@/components/planner/area-filter';
import { ChevronLeft, ChevronRight, CalendarRange } from 'lucide-react';
import { getYearBoundaries } from '@/domain/calendar';
import { buildTree, filterTreeByArea } from '@/domain/hierarchy';
import type { ItemRow, AreaRow } from '@/types/domain';

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

  const allItems: ItemRow[] = allItemsData || [];
  const areas: AreaRow[] = areasData || [];

  const { start: yearStart, end: yearEnd } = getYearBoundaries(year);

  const yearItems = allItems.filter(
    (item) =>
      item.horizon === 'year' &&
      item.period_start === yearStart &&
      item.period_end === yearEnd
  );

  let tree = buildTree(yearItems);
  if (activeAreaId) {
    tree = filterTreeByArea(tree, activeAreaId);
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
            Annual vision, key objectives, and high-altitude goals
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded border border-border-light bg-surface-light shadow-sm dark:border-border-dark dark:bg-surface-dark">
            <Link
              href={`/year?year=${year - 1}${activeAreaId ? `&area=${activeAreaId}` : ''}`}
              data-testid="prev-period-btn"
              className="p-1.5 hover:bg-[#F2F2EE] text-primaryText-light dark:hover:bg-[#2A2A2A] transition-colors"
              title="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href={`/year?year=${currentYear}${activeAreaId ? `&area=${activeAreaId}` : ''}`}
              className="px-2 py-1 text-xs font-medium text-mutedText-light hover:text-primaryText-light"
            >
              {currentYear}
            </Link>
            <Link
              href={`/year?year=${year + 1}${activeAreaId ? `&area=${activeAreaId}` : ''}`}
              data-testid="next-period-btn"
              className="p-1.5 hover:bg-[#F2F2EE] text-primaryText-light dark:hover:bg-[#2A2A2A] transition-colors"
              title="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <AreaFilter areas={areas} activeAreaId={activeAreaId} />
        </div>
      </div>

      {/* Year Quick Add */}
      <div>
        <QuickAdd
          defaultHorizon="year"
          defaultPeriodStart={yearStart}
          defaultPeriodEnd={yearEnd}
          defaultAreaId={activeAreaId || null}
          placeholder="Add an annual goal or high-level focus..."
        />
      </div>

      {/* Primary Year Items */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-mutedText-light dark:text-mutedText-dark">
          Annual Goals ({yearItems.length})
        </h2>
        {tree.length === 0 ? (
          <div className="rounded border border-dashed border-border-light p-8 text-center dark:border-border-dark">
            <p className="text-xs text-mutedText-light dark:text-mutedText-dark">
              No yearly goals established for {year}. Capture high-level objectives above.
            </p>
          </div>
        ) : (
          <ItemTree nodes={tree} areas={areas} />
        )}
      </section>
    </div>
  );
}

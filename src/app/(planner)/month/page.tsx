import * as React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { QuickAdd } from '@/components/planner/quick-add';
import { ItemTree } from '@/components/planner/item-tree';
import { AreaFilter } from '@/components/planner/area-filter';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { getMonthBoundaries } from '@/domain/calendar';
import { buildTree, filterTreeByArea } from '@/domain/hierarchy';
import type { ItemRow, AreaRow } from '@/types/domain';

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

  const { start: monthStart, end: monthEnd } = getMonthBoundaries(year, month);

  // Next / Previous month query strings
  const prevDate = new Date(year, month - 2, 1);
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const nextDate = new Date(year, month, 1);
  const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

  const monthItems = allItems.filter(
    (item) =>
      item.horizon === 'month' &&
      item.period_start === monthStart &&
      item.period_end === monthEnd
  );

  let tree = buildTree(monthItems);
  if (activeAreaId) {
    tree = filterTreeByArea(tree, activeAreaId);
  }

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

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
              className="p-1.5 hover:bg-[#F2F2EE] text-primaryText-light dark:hover:bg-[#2A2A2A] transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <Link
              href={`/month?month=${defaultYearMonth}${activeAreaId ? `&area=${activeAreaId}` : ''}`}
              className="px-2 py-1 text-xs font-medium text-mutedText-light hover:text-primaryText-light"
            >
              This Month
            </Link>
            <Link
              href={`/month?month=${nextMonthStr}${activeAreaId ? `&area=${activeAreaId}` : ''}`}
              data-testid="next-period-btn"
              className="p-1.5 hover:bg-[#F2F2EE] text-primaryText-light dark:hover:bg-[#2A2A2A] transition-colors"
              title="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <AreaFilter areas={areas} activeAreaId={activeAreaId} />
        </div>
      </div>

      {/* Month Quick Add */}
      <div>
        <QuickAdd
          defaultHorizon="month"
          defaultPeriodStart={monthStart}
          defaultPeriodEnd={monthEnd}
          defaultAreaId={activeAreaId || null}
          placeholder="Add a monthly milestone or project..."
        />
      </div>

      {/* Primary Month Items */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-mutedText-light dark:text-mutedText-dark">
          Monthly Outcomes ({monthItems.length})
        </h2>
        {tree.length === 0 ? (
          <div className="rounded border border-dashed border-border-light p-8 text-center dark:border-border-dark">
            <p className="text-xs text-mutedText-light dark:text-mutedText-dark">
              No items planned for {monthLabel}. Use Quick Add above to add your monthly objectives.
            </p>
          </div>
        ) : (
          <ItemTree nodes={tree} areas={areas} />
        )}
      </section>
    </div>
  );
}

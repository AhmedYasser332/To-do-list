import * as React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { QuickAdd } from '@/components/planner/quick-add';
import { ItemTree } from '@/components/planner/item-tree';
import { AreaFilter } from '@/components/planner/area-filter';
import { Calendar, Sun, Clock } from 'lucide-react';
import { buildTree, filterTreeByArea } from '@/domain/hierarchy';
import type { ItemRow as ItemRowType, AreaRow } from '@/types/domain';

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

  // Single user-scoped fetch for all items
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

  const allItems: ItemRowType[] = allItemsData || [];
  const areas: AreaRow[] = areasData || [];

  // Today's local ISO date YYYY-MM-DD
  const todayDateStr = new Date().toISOString().split('T')[0];

  // Filter day items scheduled for today
  let todayItems = allItems.filter(
    (item) => item.horizon === 'day' && item.period_start === todayDateStr
  );

  // Partition into Timed and Anytime
  const timedItems = todayItems
    .filter((item) => Boolean(item.time))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const anytimeItems = todayItems.filter((item) => !item.time);

  let timedTree = buildTree(timedItems);
  let anytimeTree = buildTree(anytimeItems);

  if (activeAreaId) {
    timedTree = filterTreeByArea(timedTree, activeAreaId);
    anytimeTree = filterTreeByArea(anytimeTree, activeAreaId);
  }

  // Relevant Week, Month, and Year items for compact context area
  const weekItems = allItems.filter((i) => i.horizon === 'week');
  const monthItems = allItems.filter((i) => i.horizon === 'month');
  const yearItems = allItems.filter((i) => i.horizon === 'year');

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
          <p className="text-xs text-mutedText-light dark:text-mutedText-dark">
            {todayFormatted}
          </p>
        </div>

        {/* Area Filter Control */}
        <AreaFilter areas={areas} activeAreaId={activeAreaId} />
      </div>

      {/* Quick Add */}
      <div className="pt-1">
        <QuickAdd
          defaultHorizon="day"
          defaultPeriodStart={todayDateStr}
          defaultPeriodEnd={todayDateStr}
          defaultAreaId={activeAreaId || null}
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
          <ItemTree nodes={timedTree} areas={areas} />
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
          <ItemTree nodes={anytimeTree} areas={areas} />
        )}
      </section>

      {/* Compact Context Area (Relevant Week, Month, and Year items) */}
      {(weekItems.length > 0 || monthItems.length > 0 || yearItems.length > 0) && (
        <section className="pt-4 border-t border-border-light/60 dark:border-border-dark/60 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-mutedText-light dark:text-mutedText-dark">
            Planning Context
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Week Context */}
            <div className="rounded border border-border-light bg-surface-light p-2.5 dark:border-border-dark dark:bg-surface-dark">
              <span className="text-[11px] font-medium text-mutedText-light block mb-1">
                This Week ({weekItems.length})
              </span>
              <div className="space-y-1">
                {weekItems.slice(0, 3).map((w) => (
                  <div key={w.id} className="text-xs truncate text-primaryText-light dark:text-primaryText-dark">
                    • {w.title}
                  </div>
                ))}
              </div>
            </div>

            {/* Month Context */}
            <div className="rounded border border-border-light bg-surface-light p-2.5 dark:border-border-dark dark:bg-surface-dark">
              <span className="text-[11px] font-medium text-mutedText-light block mb-1">
                This Month ({monthItems.length})
              </span>
              <div className="space-y-1">
                {monthItems.slice(0, 3).map((m) => (
                  <div key={m.id} className="text-xs truncate text-primaryText-light dark:text-primaryText-dark">
                    • {m.title}
                  </div>
                ))}
              </div>
            </div>

            {/* Year Context */}
            <div className="rounded border border-border-light bg-surface-light p-2.5 dark:border-border-dark dark:bg-surface-dark">
              <span className="text-[11px] font-medium text-mutedText-light block mb-1">
                This Year ({yearItems.length})
              </span>
              <div className="space-y-1">
                {yearItems.slice(0, 3).map((y) => (
                  <div key={y.id} className="text-xs truncate text-primaryText-light dark:text-primaryText-dark">
                    • {y.title}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

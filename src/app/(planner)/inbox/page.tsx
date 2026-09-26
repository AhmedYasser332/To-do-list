import * as React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { QuickAdd } from '@/components/planner/quick-add';
import { ItemTree } from '@/components/planner/item-tree';
import { AreaFilter } from '@/components/planner/area-filter';
import { Inbox } from 'lucide-react';
import { buildTree, projectTreeForView, filterTreeByArea } from '@/domain/hierarchy';
import type { ItemRow, AreaRow, WeekDay } from '@/types/domain';

interface InboxPageProps {
  searchParams: Promise<{ area?: string }>;
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
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

  const allItems: ItemRow[] = allItemsData || [];
  const areas: AreaRow[] = areasData || [];
  const firstDayOfWeek: WeekDay = prefsData?.first_day_of_week || 'monday';

  // 1. Build complete hierarchy and calculate progress across full tree (T069)
  const fullTree = buildTree(allItems);

  // 2. Project full tree into Inbox items
  let tree = projectTreeForView(fullTree, (item) => item.horizon === 'inbox');

  if (activeAreaId) {
    tree = filterTreeByArea(tree, activeAreaId);
  }

  const totalInboxCount = allItems.filter((i) => i.horizon === 'inbox').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-border-light pb-4 dark:border-border-dark sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-primaryText-light dark:text-primaryText-dark flex items-center gap-2">
            <Inbox className="h-5 w-5 text-accent" />
            <span>Inbox</span>
          </h1>
          <p className="text-xs text-mutedText-light dark:text-mutedText-dark">
            Frictionless quick-capture for ideas and unplaced items ({totalInboxCount})
          </p>
        </div>

        <AreaFilter areas={areas} activeAreaId={activeAreaId} />
      </div>

      {/* Quick Add with Progressive Controls (T073) */}
      <div>
        <QuickAdd
          defaultHorizon="inbox"
          defaultAreaId={activeAreaId || null}
          areas={areas}
          candidateParents={allItems}
          placeholder="Capture a thought to your Inbox... (press Enter)"
        />
      </div>

      {/* Items Tree */}
      <section className="space-y-2">
        {tree.length === 0 ? (
          <div className="rounded border border-dashed border-border-light p-8 text-center dark:border-border-dark">
            <p className="text-xs text-mutedText-light dark:text-mutedText-dark">
              Your Inbox is empty. Type a title above and press Enter to quickly capture anything.
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
    </div>
  );
}

import * as React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { QuickAdd } from '@/components/planner/quick-add';
import { ItemTree } from '@/components/planner/item-tree';
import { AreaFilter } from '@/components/planner/area-filter';
import { Inbox } from 'lucide-react';
import { buildTree, filterTreeByArea } from '@/domain/hierarchy';
import type { ItemRow, AreaRow } from '@/types/domain';

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

  // Filter items assigned to Inbox horizon (and their children)
  const inboxItems = allItems.filter((item) => item.horizon === 'inbox');
  let tree = buildTree(inboxItems);

  if (activeAreaId) {
    tree = filterTreeByArea(tree, activeAreaId);
  }

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
            Frictionless quick-capture for ideas and unplaced items ({inboxItems.length})
          </p>
        </div>

        <AreaFilter areas={areas} activeAreaId={activeAreaId} />
      </div>

      {/* Quick Add */}
      <div>
        <QuickAdd
          defaultHorizon="inbox"
          defaultAreaId={activeAreaId || null}
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
          <ItemTree nodes={tree} areas={areas} />
        )}
      </section>
    </div>
  );
}

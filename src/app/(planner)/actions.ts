'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { wouldCreateCycle, determineChildScheduling, getDescendants } from '@/domain/hierarchy';
import type { Horizon, ItemStatus } from '@/types/domain';

function revalidatePlanner() {
  revalidatePath('/(planner)', 'layout');
}

export async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: claimsData, error } = await supabase.auth.getClaims();

  if (error || !claimsData?.claims?.sub) {
    throw new Error('Unauthorized');
  }

  return claimsData.claims.sub as string;
}

export async function createItem(input: {
  title: string;
  horizon?: Horizon;
  periodStart?: string | null;
  periodEnd?: string | null;
  time?: string | null;
  areaId?: string | null;
  parentId?: string | null;
}) {
  const userId = await getAuthenticatedUserId();
  const title = input.title.trim();

  if (!title) {
    return { error: 'Item title is required.' };
  }

  const horizon = input.horizon || 'inbox';
  const periodStart = horizon === 'inbox' ? null : input.periodStart || null;
  const periodEnd =
    horizon === 'inbox'
      ? null
      : horizon === 'day'
      ? periodStart
      : input.periodEnd || periodStart;
  const time = horizon === 'day' && input.time ? input.time : null;

  const supabase = await createClient();

  // Find max sort_order among siblings
  const { data: existingItems } = await supabase
    .from('items')
    .select('sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder = existingItems && existingItems.length > 0 ? (existingItems[0].sort_order + 1) : 0;

  const { data, error } = await supabase
    .from('items')
    .insert({
      user_id: userId,
      parent_id: input.parentId || null,
      title,
      horizon,
      period_start: periodStart,
      period_end: periodEnd,
      time,
      area_id: input.areaId || null,
      sort_order: nextSortOrder,
      status: 'incomplete',
      weight: 1.0,
      is_manually_completed: false,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePlanner();

  return { success: true, item: data };
}

export async function toggleItemCompletion(itemId: string, currentStatus: ItemStatus) {
  const userId = await getAuthenticatedUserId();
  const supabase = await createClient();

  const isCurrentlyComplete = currentStatus === 'complete';
  const nextStatus: ItemStatus = isCurrentlyComplete ? 'incomplete' : 'complete';
  const completedAt = isCurrentlyComplete ? null : new Date().toISOString();

  const { error } = await supabase
    .from('items')
    .update({
      status: nextStatus,
      completed_at: completedAt,
      is_manually_completed: false,
    })
    .eq('id', itemId)
    .eq('user_id', userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePlanner();

  return { success: true };
}

export async function createChildItem(parentId: string, title: string) {
  const userId = await getAuthenticatedUserId();
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    return { error: 'Subtask title is required.' };
  }

  const supabase = await createClient();

  // Fetch parent to verify ownership and inherit context
  const { data: parent, error: parentError } = await supabase
    .from('items')
    .select('*')
    .eq('id', parentId)
    .eq('user_id', userId)
    .single();

  if (parentError || !parent) {
    return { error: 'Parent item not found.' };
  }

  // Inherit context using domain rules: Area is inherited; ONLY Day parent gives Day horizon & date
  const childScheduling = determineChildScheduling(parent);

  // Find max sort_order among siblings of this parent
  const { data: siblings } = await supabase
    .from('items')
    .select('sort_order')
    .eq('user_id', userId)
    .eq('parent_id', parentId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder = siblings && siblings.length > 0 ? siblings[0].sort_order + 1 : 0;

  const { data: newChild, error: insertError } = await supabase
    .from('items')
    .insert({
      user_id: userId,
      parent_id: parentId,
      title: trimmedTitle,
      horizon: childScheduling.horizon,
      period_start: childScheduling.period_start,
      period_end: childScheduling.period_end,
      time: childScheduling.time,
      area_id: childScheduling.area_id,
      sort_order: nextSortOrder,
      status: 'incomplete',
      weight: 1.0,
      is_manually_completed: false,
    })
    .select()
    .single();

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePlanner();

  return { success: true, item: newChild };
}

export async function resolveParentCompletion(
  parentId: string,
  mode: 'parent_only' | 'all_descendants'
) {
  const userId = await getAuthenticatedUserId();
  const supabase = await createClient();
  const now = new Date().toISOString();

  if (mode === 'parent_only') {
    const { error } = await supabase
      .from('items')
      .update({
        status: 'complete',
        completed_at: now,
        is_manually_completed: true,
      })
      .eq('id', parentId)
      .eq('user_id', userId);

    if (error) return { error: error.message };
  } else if (mode === 'all_descendants') {
    // 1. Complete the parent
    await supabase
      .from('items')
      .update({
        status: 'complete',
        completed_at: now,
        is_manually_completed: false,
      })
      .eq('id', parentId)
      .eq('user_id', userId);

    // 2. Fetch all user items to compute recursive descendants
    const { data: allItems } = await supabase
      .from('items')
      .select('id, parent_id')
      .eq('user_id', userId);

    if (allItems) {
      // Find all recursive descendants of parentId
      const childrenMap = new Map<string, string[]>();
      allItems.forEach((item) => {
        if (item.parent_id) {
          const list = childrenMap.get(item.parent_id) || [];
          list.push(item.id);
          childrenMap.set(item.parent_id, list);
        }
      });

      const descendantIds: string[] = [];
      const queue = [...(childrenMap.get(parentId) || [])];
      while (queue.length > 0) {
        const id = queue.shift()!;
        descendantIds.push(id);
        const children = childrenMap.get(id) || [];
        queue.push(...children);
      }

      if (descendantIds.length > 0) {
        await supabase
          .from('items')
          .update({
            status: 'complete',
            completed_at: now,
            is_manually_completed: false,
          })
          .in('id', descendantIds)
          .eq('user_id', userId);
      }
    }
  }

  revalidatePlanner();

  return { success: true };
}

export async function reopenParent(parentId: string) {
  const userId = await getAuthenticatedUserId();
  const supabase = await createClient();

  const { error } = await supabase
    .from('items')
    .update({
      status: 'incomplete',
      completed_at: null,
      is_manually_completed: false,
    })
    .eq('id', parentId)
    .eq('user_id', userId);

  if (error) return { error: error.message };

  revalidatePlanner();

  return { success: true };
}

export async function updatePreferences(firstDayOfWeek: import('@/types/domain').WeekDay) {
  const userId = await getAuthenticatedUserId();
  const supabase = await createClient();

  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      first_day_of_week: firstDayOfWeek,
      updated_at: new Date().toISOString(),
    });

  if (error) return { error: error.message };

  revalidatePath('/settings');
  revalidatePath('/week');
  revalidatePath('/today');

  return { success: true };
}

export async function createArea(name: string, icon = 'folder', colorToken: string | null = null) {
  const userId = await getAuthenticatedUserId();
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { error: 'Area name is required.' };
  }

  const supabase = await createClient();

  const { data: areas } = await supabase
    .from('areas')
    .select('sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = areas && areas.length > 0 ? areas[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from('areas')
    .insert({
      user_id: userId,
      name: trimmedName,
      icon,
      color_token: colorToken,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/settings');
  revalidatePath('/today');
  revalidatePath('/week');
  revalidatePath('/month');
  revalidatePath('/year');
  revalidatePath('/inbox');

  return { success: true, area: data };
}

export async function updateArea(id: string, name: string, icon = 'folder', colorToken?: string | null) {
  const userId = await getAuthenticatedUserId();
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { error: 'Area name is required.' };
  }

  const supabase = await createClient();

  const updatePayload: Record<string, any> = {
    name: trimmedName,
    icon,
    updated_at: new Date().toISOString(),
  };
  if (colorToken !== undefined) {
    updatePayload.color_token = colorToken;
  }

  const { error } = await supabase
    .from('areas')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return { error: error.message };

  revalidatePath('/settings');
  revalidatePath('/today');
  revalidatePath('/week');
  revalidatePath('/month');
  revalidatePath('/year');
  revalidatePath('/inbox');

  return { success: true };
}

export async function deleteArea(id: string) {
  const userId = await getAuthenticatedUserId();
  const supabase = await createClient();

  // 1. Disassociate items in this Area so foreign key constraints don't block deletion
  await supabase
    .from('items')
    .update({ area_id: null })
    .eq('area_id', id)
    .eq('user_id', userId);

  const { error } = await supabase
    .from('areas')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return { error: error.message };

  revalidatePlanner();
  revalidatePath('/settings');

  return { success: true };
}

export async function updateItemDetails(
  itemId: string,
  updates: {
    title?: string;
    description?: string | null;
    horizon?: Horizon;
    periodStart?: string | null;
    periodEnd?: string | null;
    time?: string | null;
    areaId?: string | null;
    weight?: number;
    parentId?: string | null;
    status?: ItemStatus;
  }
) {
  const userId = await getAuthenticatedUserId();
  const supabase = await createClient();

  // Fetch current item
  const { data: currentItem, error: fetchError } = await supabase
    .from('items')
    .select('*')
    .eq('id', itemId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !currentItem) {
    return { error: 'Item not found.' };
  }

  // 1. Cycle Prevention: if parentId is being changed, verify no ancestor loop is created
  if (updates.parentId !== undefined && updates.parentId !== currentItem.parent_id) {
    const { data: allItems } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', userId);

    if (allItems && wouldCreateCycle(allItems, itemId, updates.parentId)) {
      return { error: 'Cannot set parent: this would create a circular hierarchy.' };
    }
  }

  // 2. Completion Backdoor Prevention:
  // Marking a parent with incomplete descendants directly complete must route through the 3-option completion dialog
  if (updates.status === 'complete' && currentItem.status !== 'complete') {
    const { data: allUserItems } = await supabase
      .from('items')
      .select('id, parent_id, status')
      .eq('user_id', userId);

    if (allUserItems) {
      const descendants = getDescendants(allUserItems as any, itemId);
      const hasIncompleteDescendants = descendants.some((d) => d.status === 'incomplete');
      if (hasIncompleteDescendants) {
        return {
          error: 'Cannot mark parent complete directly while subtasks remain incomplete. Please use the completion prompt.',
        };
      }
    }
  }

  const patch: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) {
    const trimmed = updates.title.trim();
    if (!trimmed) return { error: 'Title cannot be empty.' };
    patch.title = trimmed;
  }
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.horizon !== undefined) patch.horizon = updates.horizon;
  if (updates.periodStart !== undefined) patch.period_start = updates.periodStart;
  if (updates.periodEnd !== undefined) patch.period_end = updates.periodEnd;
  if (updates.time !== undefined) patch.time = updates.time;
  if (updates.areaId !== undefined) patch.area_id = updates.areaId;
  if (updates.weight !== undefined) {
    const w = Number(updates.weight);
    if (!Number.isFinite(w) || w <= 0) return { error: 'Weight must be a positive number.' };
    patch.weight = w;
  }
  if (updates.parentId !== undefined) patch.parent_id = updates.parentId;
  if (updates.status !== undefined) {
    patch.status = updates.status;
    if (updates.status === 'complete') {
      patch.completed_at = new Date().toISOString();
    } else if (updates.status === 'incomplete' || updates.status === 'cancelled') {
      patch.completed_at = null;
      patch.is_manually_completed = false;
    }
  }

  const { error: updateError } = await supabase
    .from('items')
    .update(patch)
    .eq('id', itemId)
    .eq('user_id', userId);

  if (updateError) return { error: updateError.message };

  revalidatePlanner();

  return { success: true };
}

export async function reorderItems(reorderedItems: { id: string; sort_order: number }[]) {
  const userId = await getAuthenticatedUserId();
  const supabase = await createClient();

  for (const item of reorderedItems) {
    await supabase
      .from('items')
      .update({ sort_order: item.sort_order })
      .eq('id', item.id)
      .eq('user_id', userId);
  }

  revalidatePlanner();

  return { success: true };
}

export async function deleteItemSubtree(itemId: string) {
  const userId = await getAuthenticatedUserId();
  const supabase = await createClient();

  // Cascading foreign key automatically removes descendants
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', userId);

  if (error) return { error: error.message };

  revalidatePlanner();

  return { success: true };
}

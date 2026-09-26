import type { ItemRow, ItemNode } from '@/types/domain';

/**
 * Calculates progress for an individual item given its direct children.
 * Leaf items: binary 0% or 100% based on status === 'complete'.
 * Parents: weighted average of active (non-cancelled) direct children.
 * Manual completion override: returns 100% if is_manually_completed === true.
 */
export function calculateItemProgress(
  item: ItemRow,
  directChildren: (ItemRow | ItemNode)[] = []
): number {
  // If parent was manually marked complete, override to 100%
  if (item.is_manually_completed) {
    return 100;
  }

  // Leaf item
  if (!directChildren || directChildren.length === 0) {
    return item.status === 'complete' ? 100 : 0;
  }

  // Parent item: filter out cancelled children
  const activeChildren = directChildren.filter(
    (child) => child.status !== 'cancelled'
  );

  if (activeChildren.length === 0) {
    return 0; // All children cancelled -> 0%
  }

  let totalWeight = 0;
  let weightedProgressSum = 0;

  for (const child of activeChildren) {
    const rawWeight = Number(child.weight);
    const weight = Number.isFinite(rawWeight) && rawWeight > 0 ? rawWeight : 1;

    // Get child's progress (if child is ItemNode with computed progress, use it; else binary)
    const childProgress =
      (child as ItemNode).progress !== undefined
        ? (child as ItemNode).progress
        : child.status === 'complete'
        ? 100
        : 0;

    weightedProgressSum += weight * childProgress;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return 0;
  }

  return Math.round(weightedProgressSum / totalWeight);
}

/**
 * Evaluates progress across an entire collection of items in a bottom-up/memoized manner.
 * Returns a map of itemId -> progress percentage (0 to 100).
 */
export function computeTreeProgress(items: ItemRow[]): Map<string, number> {
  const childrenMap = new Map<string, ItemRow[]>();
  const itemMap = new Map<string, ItemRow>();

  items.forEach((item) => {
    itemMap.set(item.id, item);
    if (item.parent_id) {
      const list = childrenMap.get(item.parent_id) || [];
      list.push(item);
      childrenMap.set(item.parent_id, list);
    }
  });

  const progressMap = new Map<string, number>();

  function evaluateItem(itemId: string): number {
    if (progressMap.has(itemId)) {
      return progressMap.get(itemId)!;
    }

    const item = itemMap.get(itemId);
    if (!item) return 0;

    const children = childrenMap.get(itemId) || [];
    // Convert children to temporary nodes with their calculated progress
    const evaluatedChildren: ItemNode[] = children.map((child) => ({
      ...child,
      progress: evaluateItem(child.id),
      children: [],
    }));

    const progress = calculateItemProgress(item, evaluatedChildren);
    progressMap.set(itemId, progress);
    return progress;
  }

  items.forEach((item) => {
    evaluateItem(item.id);
  });

  return progressMap;
}

/**
 * Calculates an item's relative contribution percentage toward its parent's progress
 * compared with its active (non-cancelled) siblings.
 * Returns null for root items with no parent.
 */
export function calculateSiblingContribution(
  itemId: string,
  allItems: ItemRow[],
  targetWeight?: number
): number | null {
  const currentItem = allItems.find((i) => i.id === itemId);
  const parentId = currentItem?.parent_id;
  if (!parentId) return null;

  const siblings = allItems.filter(
    (i) => i.parent_id === parentId && i.status !== 'cancelled'
  );

  if (siblings.length === 0) return 100;

  let totalWeight = 0;
  let itemWeight = 1;

  for (const s of siblings) {
    const rawW =
      s.id === itemId && targetWeight !== undefined
        ? targetWeight
        : Number(s.weight);
    const w = Number.isFinite(rawW) && rawW > 0 ? rawW : 1;
    if (s.id === itemId) itemWeight = w;
    totalWeight += w;
  }

  if (totalWeight <= 0) return 0;
  return Math.round((itemWeight / totalWeight) * 1000) / 10;
}

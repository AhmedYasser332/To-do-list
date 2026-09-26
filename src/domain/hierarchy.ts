import type { ItemRow, ItemNode, Horizon } from '@/types/domain';
import { computeTreeProgress } from './progress';

/**
 * Builds a nested ItemNode tree from a flat list of items, preserving sort order
 * and computing deterministic recursive progress for all nodes.
 */
export function buildTree(items: ItemRow[]): ItemNode[] {
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
  const progressMap = computeTreeProgress(sorted);
  const nodeMap = new Map<string, ItemNode>();

  // Initialize nodes with calculated progress and empty children array
  sorted.forEach((item) => {
    nodeMap.set(item.id, {
      ...item,
      progress: progressMap.get(item.id) ?? (item.status === 'complete' ? 100 : 0),
      children: [],
    });
  });

  const roots: ItemNode[] = [];

  sorted.forEach((item) => {
    const node = nodeMap.get(item.id)!;
    if (item.parent_id && nodeMap.has(item.parent_id)) {
      const parentNode = nodeMap.get(item.parent_id)!;
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

/**
 * Validates whether assigning candidateParentId as the parent of itemId would create a cycle.
 * Prevents:
 * 1. Self-parenting (itemId === candidateParentId)
 * 2. Assigning an item under any of its own direct or indirect descendants
 */
export function wouldCreateCycle(
  items: ItemRow[],
  itemId: string,
  candidateParentId: string | null
): boolean {
  if (!candidateParentId) return false;
  if (candidateParentId === itemId) return true;

  const parentMap = new Map<string, string | null>();
  items.forEach((item) => parentMap.set(item.id, item.parent_id));

  // Traverse upward from candidateParentId to root
  let current: string | null = candidateParentId;
  const visited = new Set<string>();

  while (current) {
    if (current === itemId) {
      return true; // Found itemId in candidate parent's ancestor chain -> Cycle!
    }
    if (visited.has(current)) {
      return true; // Malformed input already had a cycle
    }
    visited.add(current);
    current = parentMap.get(current) || null;
  }

  return false;
}

/**
 * Collects all recursive descendants of a given parentId
 */
export function getDescendants(items: ItemRow[], parentId: string): ItemRow[] {
  const childrenMap = new Map<string, ItemRow[]>();

  items.forEach((item) => {
    if (item.parent_id) {
      const list = childrenMap.get(item.parent_id) || [];
      list.push(item);
      childrenMap.set(item.parent_id, list);
    }
  });

  const descendants: ItemRow[] = [];
  const queue = [...(childrenMap.get(parentId) || [])];

  while (queue.length > 0) {
    const current = queue.shift()!;
    descendants.push(current);
    const children = childrenMap.get(current.id) || [];
    queue.push(...children);
  }

  return descendants;
}

export type FilteredItemNode = ItemNode & { isContextRow?: boolean };

/**
 * Projects a tree filtered by Area:
 * - Matching nodes are kept as active matches (isContextRow = false)
 * - Non-matching ancestors required to understand matching descendants are kept as contextual rows (isContextRow = true)
 * - Unrelated branches with 0 matching descendants are pruned
 */
export function filterTreeByArea(
  nodes: ItemNode[],
  selectedAreaId: string
): FilteredItemNode[] {
  const result: FilteredItemNode[] = [];

  for (const node of nodes) {
    const filteredChildren = filterTreeByArea(node.children, selectedAreaId);
    const isDirectMatch = node.area_id === selectedAreaId;
    const hasMatchingDescendants = filteredChildren.length > 0;

    if (isDirectMatch) {
      result.push({
        ...node,
        isContextRow: false,
        children: filteredChildren,
      });
    } else if (hasMatchingDescendants) {
      result.push({
        ...node,
        isContextRow: true,
        children: filteredChildren,
      });
    }
  }

  return result;
}

export interface ChildSchedulingContext {
  horizon: Horizon;
  period_start: string | null;
  period_end: string | null;
  time: null;
  area_id: string | null;
}

/**
 * Determines child item scheduling and area inheritance rules (T070).
 * - Parent relationship is always established.
 * - Area is inherited when parent has an Area.
 * - ONLY a Day parent automatically gives its child Day horizon and date.
 * - Inbox, Week, Month, and Year parents create unscheduled Inbox children.
 */
export function determineChildScheduling(parent: {
  horizon: Horizon;
  period_start?: string | null;
  period_end?: string | null;
  area_id?: string | null;
}): ChildSchedulingContext {
  const isDayParent = parent.horizon === 'day';
  return {
    horizon: isDayParent ? 'day' : 'inbox',
    period_start: isDayParent ? parent.period_start ?? null : null,
    period_end: isDayParent ? parent.period_end ?? null : null,
    time: null,
    area_id: parent.area_id ?? null,
  };
}

/**
 * Projects an already-computed full tree into a specific view without recalculating or truncating progress.
 * Finds all nodes matching the view predicate.
 * If a matching node's parent is also in the view, it stays nested under that parent.
 * If its parent is outside the view (or null), it is promoted to a top-level root for that view.
 */
export function projectTreeForView(
  fullTree: ItemNode[],
  predicate: (item: ItemRow) => boolean
): ItemNode[] {
  const matchingMap = new Map<string, ItemNode>();

  function collectMatching(nodes: ItemNode[]) {
    for (const node of nodes) {
      if (predicate(node)) {
        matchingMap.set(node.id, {
          ...node,
          children: [...(node.children || [])],
        });
      }
      if (node.children && node.children.length > 0) {
        collectMatching(node.children);
      }
    }
  }

  collectMatching(fullTree);

  const projectedRoots: ItemNode[] = [];

  for (const node of matchingMap.values()) {
    if (node.parent_id && matchingMap.has(node.parent_id)) {
      // Parent is also in this view, so this node remains inside parent's children array
    } else {
      projectedRoots.push(node);
    }
  }

  return projectedRoots.sort((a, b) => a.sort_order - b.sort_order);
}

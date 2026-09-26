import type { ItemNode } from '@/types/domain';

/**
 * Pure domain function to reorder siblings within the same parent or list,
 * assigning sequential integer sort_order values (0, 1, 2, ...).
 */
export function reorderSiblingList<T extends { sort_order: number }>(
  items: T[],
  sourceIndex: number,
  targetIndex: number
): T[] {
  if (
    sourceIndex < 0 ||
    sourceIndex >= items.length ||
    targetIndex < 0 ||
    targetIndex >= items.length ||
    sourceIndex === targetIndex
  ) {
    return items;
  }

  const result = [...items];
  const [removed] = result.splice(sourceIndex, 1);
  result.splice(targetIndex, 0, removed);

  return result.map((item, index) => ({
    ...item,
    sort_order: index,
  }));
}

/**
 * Recursively locates a target node and its immediate sibling list in a tree.
 */
export function findNodeAndSiblings(
  tree: ItemNode[],
  targetId: string,
  parent: ItemNode | null = null
): { parentNode: ItemNode | null; siblings: ItemNode[] } | null {
  if (tree.some((n) => n.id === targetId)) {
    return { parentNode: parent, siblings: tree };
  }

  for (const node of tree) {
    if (node.children && node.children.length > 0) {
      const found = findNodeAndSiblings(node.children, targetId, node);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Updates a tree after a same-parent sibling reorder operation, replacing
 * the old siblings with the reordered siblings at the correct hierarchy depth.
 */
export function updateTreeWithReorderedSiblings(
  tree: ItemNode[],
  parentId: string | null,
  reorderedSiblings: ItemNode[]
): ItemNode[] {
  if (parentId === null) {
    return reorderedSiblings;
  }

  return tree.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        children: reorderedSiblings,
      };
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: updateTreeWithReorderedSiblings(
          node.children,
          parentId,
          reorderedSiblings
        ),
      };
    }
    return node;
  });
}


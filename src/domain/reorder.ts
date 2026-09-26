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

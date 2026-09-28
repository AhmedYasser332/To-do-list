import { describe, it, expect } from 'vitest';
import { getAreaColor, isValidAreaIcon, AREA_PALETTE, AREA_ICONS } from '@/domain/areas';
import {
  buildTree,
  projectTreeForView,
  filterTreeByArea,
  determineChildScheduling,
  type FilteredItemNode,
} from '@/domain/hierarchy';
import type { ItemRow, ItemNode } from '@/types/domain';

function createMockItem(partial: Partial<ItemRow> & { id: string }): ItemRow {
  return {
    id: partial.id,
    user_id: 'user-1',
    parent_id: partial.parent_id ?? null,
    title: partial.title ?? `Item ${partial.id}`,
    description: partial.description ?? null,
    horizon: partial.horizon ?? 'day',
    period_start: partial.period_start ?? '2026-09-26',
    period_end: partial.period_end ?? '2026-09-26',
    time: partial.time ?? null,
    area_id: partial.area_id ?? null,
    weight: partial.weight ?? 1,
    status: partial.status ?? 'incomplete',
    is_manually_completed: partial.is_manually_completed ?? false,
    sort_order: partial.sort_order ?? 0,
    completed_at: partial.completed_at ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe('UAT Stabilization Cleanup — Domain & Logic Tests', () => {
  describe('Area Color Tokens & Icons', () => {
    it('getAreaColor resolves semantic tokens to valid hex values', () => {
      expect(getAreaColor('sage-green')).toBe('#4A7C59');
      expect(getAreaColor('steel-blue')).toBe('#3B6D9E');
      expect(getAreaColor('warm-amber')).toBe('#C68B45');
      expect(getAreaColor('muted-coral')).toBe('#C46859');
      expect(getAreaColor('slate')).toBe('#64748B');
      expect(getAreaColor('olive')).toBe('#606C38');
      expect(getAreaColor('terracotta')).toBe('#A85A48');
      expect(getAreaColor('indigo')).toBe('#4F5D75');
    });

    it('getAreaColor passes through valid hex and falls back to default steel-blue', () => {
      expect(getAreaColor('#123456')).toBe('#123456');
      expect(getAreaColor(null)).toBe('#3B6D9E');
      expect(getAreaColor(undefined)).toBe('#3B6D9E');
      expect(getAreaColor('unknown-token')).toBe('#3B6D9E');
    });

    it('isValidAreaIcon validates icons in the fixed set', () => {
      expect(isValidAreaIcon('folder')).toBe(true);
      expect(isValidAreaIcon('book')).toBe(true);
      expect(isValidAreaIcon('briefcase')).toBe(true);
      expect(isValidAreaIcon('dumbbell')).toBe(true);
      expect(isValidAreaIcon('heart')).toBe(true);
      expect(isValidAreaIcon('home')).toBe(true);
      expect(isValidAreaIcon('non-existent-icon')).toBe(false);
    });
  });

  describe('Today Completion Summary Calculation', () => {
    it('calculates completed count, total count, and tree-derived progress percentage', () => {
      function calculateTodaySummary(nodes: ItemNode[]) {
        function collect(list: ItemNode[]): ItemNode[] {
          const res: ItemNode[] = [];
          for (const n of list) {
            if (!(n as any).isContextRow) res.push(n);
            if (n.children && n.children.length > 0) res.push(...collect(n.children));
          }
          return res;
        }

        const items = collect(nodes);
        const total = items.length;
        const completed = items.filter((i) => i.status === 'complete').length;
        const progress =
          total > 0
            ? Math.round(
                items.reduce((acc, i) => acc + (i.progress ?? (i.status === 'complete' ? 100 : 0)), 0) /
                  total
              )
            : 0;

        return { total, completed, progress };
      }

      const items: ItemRow[] = [
        createMockItem({ id: 't1', status: 'complete', weight: 1 }),
        createMockItem({ id: 't2', status: 'incomplete', weight: 1 }),
        createMockItem({ id: 't3', status: 'complete', weight: 1 }),
        createMockItem({ id: 't4', status: 'incomplete', weight: 1 }),
      ];
      const tree = buildTree(items);
      const summary = calculateTodaySummary(tree);

      expect(summary.total).toBe(4);
      expect(summary.completed).toBe(2);
      expect(summary.progress).toBe(50);
    });
  });

  describe('Full Hierarchy Planning Context & Area Filtering', () => {
    it('projectTreeForView finds nested horizon items across full hierarchy', () => {
      // Month item nested as child of Year item
      const allItems: ItemRow[] = [
        createMockItem({
          id: 'year-1',
          horizon: 'year',
          period_start: '2026-01-01',
          period_end: '2026-12-31',
        }),
        createMockItem({
          id: 'month-nested',
          parent_id: 'year-1',
          horizon: 'month',
          period_start: '2026-09-01',
          period_end: '2026-09-30',
        }),
        createMockItem({
          id: 'week-deep',
          parent_id: 'month-nested',
          horizon: 'week',
          period_start: '2026-09-21',
          period_end: '2026-09-27',
        }),
      ];

      const fullTree = buildTree(allItems);

      // Searching for week items in full hierarchy finds the deeply nested week item
      const weekNodes = projectTreeForView(
        fullTree,
        (i) => i.horizon === 'week' && i.period_start === '2026-09-21' && i.period_end === '2026-09-27'
      );

      expect(weekNodes).toHaveLength(1);
      expect(weekNodes[0].id).toBe('week-deep');

      // Searching for month items in full hierarchy finds the nested month item
      const monthNodes = projectTreeForView(
        fullTree,
        (i) => i.horizon === 'month' && i.period_start === '2026-09-01' && i.period_end === '2026-09-30'
      );
      expect(monthNodes).toHaveLength(1);
      expect(monthNodes[0].id).toBe('month-nested');
    });

    it('filterTreeByArea filters horizon items and retains contextual ancestors', () => {
      const allItems: ItemRow[] = [
        createMockItem({
          id: 'parent-area-1',
          area_id: 'area-1',
          horizon: 'week',
          period_start: '2026-09-21',
          period_end: '2026-09-27',
        }),
        createMockItem({
          id: 'child-area-2',
          parent_id: 'parent-area-1',
          area_id: 'area-2',
          horizon: 'day',
          period_start: '2026-09-26',
          period_end: '2026-09-26',
        }),
      ];

      const fullTree = buildTree(allItems);

      // Filter for area-2: parent-area-1 should be retained as a context row
      const filtered: FilteredItemNode[] = filterTreeByArea(fullTree, 'area-2');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('parent-area-1');
      expect(filtered[0].isContextRow).toBe(true);
      expect(filtered[0].children).toHaveLength(1);
      expect(filtered[0].children[0].id).toBe('child-area-2');
      expect((filtered[0].children[0] as FilteredItemNode).isContextRow).toBe(false);
    });
  });

  describe('Child Scheduling & Context Invariants', () => {
    it('inherits parent Area and Day scheduling only from Day parent', () => {
      const dayParent = {
        horizon: 'day' as const,
        period_start: '2026-09-26',
        period_end: '2026-09-26',
        area_id: 'area-work',
      };
      const dayChild = determineChildScheduling(dayParent);
      expect(dayChild.horizon).toBe('day');
      expect(dayChild.period_start).toBe('2026-09-26');
      expect(dayChild.period_end).toBe('2026-09-26');
      expect(dayChild.area_id).toBe('area-work');

      const weekParent = {
        horizon: 'week' as const,
        period_start: '2026-09-21',
        period_end: '2026-09-27',
        area_id: 'area-study',
      };
      const weekChild = determineChildScheduling(weekParent);
      expect(weekChild.horizon).toBe('inbox');
      expect(weekChild.period_start).toBeNull();
      expect(weekChild.period_end).toBeNull();
      expect(weekChild.area_id).toBe('area-study');

      const monthParent = {
        horizon: 'month' as const,
        period_start: '2026-09-01',
        period_end: '2026-09-30',
        area_id: null,
      };
      const monthChild = determineChildScheduling(monthParent);
      expect(monthChild.horizon).toBe('inbox');
      expect(monthChild.period_start).toBeNull();
      expect(monthChild.area_id).toBeNull();
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  buildTree,
  wouldCreateCycle,
  getDescendants,
  filterTreeByArea,
  determineChildScheduling,
  projectTreeForView,
} from '@/domain/hierarchy';
import type { ItemRow } from '@/types/domain';

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

describe('Hierarchy Domain Logic (buildTree, cycle prevention, descendants)', () => {
  it('buildTree creates nested ItemNode structure with arbitrary depth', () => {
    const items: ItemRow[] = [
      createMockItem({ id: 'root-1', sort_order: 1 }),
      createMockItem({ id: 'child-1-1', parent_id: 'root-1', sort_order: 1 }),
      createMockItem({ id: 'grandchild-1-1-1', parent_id: 'child-1-1', sort_order: 1 }),
      createMockItem({ id: 'great-grandchild-1', parent_id: 'grandchild-1-1-1', sort_order: 1 }),
      createMockItem({ id: 'root-2', sort_order: 2 }),
    ];

    const tree = buildTree(items);
    expect(tree).toHaveLength(2);
    expect(tree[0].id).toBe('root-1');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].id).toBe('child-1-1');
    expect(tree[0].children[0].children).toHaveLength(1);
    expect(tree[0].children[0].children[0].id).toBe('grandchild-1-1-1');
    expect(tree[0].children[0].children[0].children[0].id).toBe('great-grandchild-1');
    expect(tree[1].id).toBe('root-2');
    expect(tree[1].children).toHaveLength(0);
  });

  describe('wouldCreateCycle', () => {
    const items: ItemRow[] = [
      createMockItem({ id: 'A' }),
      createMockItem({ id: 'B', parent_id: 'A' }),
      createMockItem({ id: 'C', parent_id: 'B' }),
      createMockItem({ id: 'D', parent_id: 'C' }),
      createMockItem({ id: 'X' }),
    ];

    it('returns false when setting parent to null (making root)', () => {
      expect(wouldCreateCycle(items, 'B', null)).toBe(false);
    });

    it('returns false when moving to an unrelated branch', () => {
      expect(wouldCreateCycle(items, 'C', 'X')).toBe(false);
    });

    it('returns true when assigning an item as its own parent', () => {
      expect(wouldCreateCycle(items, 'A', 'A')).toBe(true);
      expect(wouldCreateCycle(items, 'B', 'B')).toBe(true);
    });

    it('returns true when assigning an item under its direct child', () => {
      expect(wouldCreateCycle(items, 'A', 'B')).toBe(true);
    });

    it('returns true when assigning an item under a deep descendant', () => {
      expect(wouldCreateCycle(items, 'A', 'D')).toBe(true);
      expect(wouldCreateCycle(items, 'B', 'D')).toBe(true);
    });
  });

  describe('getDescendants', () => {
    it('returns all recursive descendants of a given item', () => {
      const items: ItemRow[] = [
        createMockItem({ id: 'root' }),
        createMockItem({ id: 'c1', parent_id: 'root' }),
        createMockItem({ id: 'c2', parent_id: 'root' }),
        createMockItem({ id: 'gc1', parent_id: 'c1' }),
        createMockItem({ id: 'unrelated' }),
      ];

      const descendants = getDescendants(items, 'root');
      const ids = descendants.map((d) => d.id).sort();
      expect(ids).toEqual(['c1', 'c2', 'gc1']);
    });
  });

  describe('filterTreeByArea with contextual ancestors', () => {
    it('preserves non-matching ancestors as contextual rows and hides unrelated branches', () => {
      const items: ItemRow[] = [
        createMockItem({ id: 'parent', area_id: 'personal' }),
        createMockItem({ id: 'child', parent_id: 'parent', area_id: 'study' }),
        createMockItem({ id: 'grandchild', parent_id: 'child', area_id: 'study' }),
        createMockItem({ id: 'unrelated-branch', area_id: 'personal' }),
      ];

      const tree = buildTree(items);
      const filtered = filterTreeByArea(tree, 'study');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('parent');
      expect((filtered[0] as any).isContextRow).toBe(true);
      expect(filtered[0].children).toHaveLength(1);
      expect(filtered[0].children[0].id).toBe('child');
      expect((filtered[0].children[0] as any).isContextRow).toBe(false);
      expect(filtered[0].children[0].children[0].id).toBe('grandchild');
      expect((filtered[0].children[0].children[0] as any).isContextRow).toBe(false);
    });
  });

  describe('determineChildScheduling (T070 inheritance rules)', () => {
    it('inherits Day horizon and parent date when parent is a Day item', () => {
      const parent = createMockItem({
        id: 'day-parent',
        horizon: 'day',
        period_start: '2026-09-26',
        period_end: '2026-09-26',
        area_id: 'area-study',
      });

      const childContext = determineChildScheduling(parent);
      expect(childContext.horizon).toBe('day');
      expect(childContext.period_start).toBe('2026-09-26');
      expect(childContext.period_end).toBe('2026-09-26');
      expect(childContext.time).toBeNull();
      expect(childContext.area_id).toBe('area-study');
    });

    it('creates an unscheduled Inbox item when parent is a Week item (does NOT inherit Week schedule)', () => {
      const parent = createMockItem({
        id: 'week-parent',
        horizon: 'week',
        period_start: '2026-09-21',
        period_end: '2026-09-27',
        area_id: 'area-work',
      });

      const childContext = determineChildScheduling(parent);
      expect(childContext.horizon).toBe('inbox');
      expect(childContext.period_start).toBeNull();
      expect(childContext.period_end).toBeNull();
      expect(childContext.time).toBeNull();
      expect(childContext.area_id).toBe('area-work');
    });

    it('creates an unscheduled Inbox item when parent is a Month item (does NOT inherit Month schedule)', () => {
      const parent = createMockItem({
        id: 'month-parent',
        horizon: 'month',
        period_start: '2026-09-01',
        period_end: '2026-09-30',
        area_id: 'area-fitness',
      });

      const childContext = determineChildScheduling(parent);
      expect(childContext.horizon).toBe('inbox');
      expect(childContext.period_start).toBeNull();
      expect(childContext.period_end).toBeNull();
      expect(childContext.time).toBeNull();
      expect(childContext.area_id).toBe('area-fitness');
    });

    it('creates an unscheduled Inbox item when parent is a Year item (does NOT inherit Year schedule)', () => {
      const parent = createMockItem({
        id: 'year-parent',
        horizon: 'year',
        period_start: '2026-01-01',
        period_end: '2026-12-31',
        area_id: null,
      });

      const childContext = determineChildScheduling(parent);
      expect(childContext.horizon).toBe('inbox');
      expect(childContext.period_start).toBeNull();
      expect(childContext.period_end).toBeNull();
      expect(childContext.time).toBeNull();
      expect(childContext.area_id).toBeNull();
    });
  });

  describe('projectTreeForView (T069 Full-tree progress & projection)', () => {
    it('projects a full tree into a horizon view preserving cross-horizon progress and subtrees', () => {
      // Week goal with two Day children
      const weekGoal = createMockItem({
        id: 'week-goal',
        horizon: 'week',
        period_start: '2026-09-21',
        period_end: '2026-09-27',
      });
      const day1 = createMockItem({
        id: 'day-1',
        parent_id: 'week-goal',
        horizon: 'day',
        period_start: '2026-09-26',
        status: 'complete',
      });
      const day2 = createMockItem({
        id: 'day-2',
        parent_id: 'week-goal',
        horizon: 'day',
        period_start: '2026-09-26',
        status: 'incomplete',
      });
      // Day 2 has a nested subtask scheduled for today
      const subtask21 = createMockItem({
        id: 'subtask-2-1',
        parent_id: 'day-2',
        horizon: 'day',
        period_start: '2026-09-26',
        status: 'incomplete',
      });

      const fullTree = buildTree([weekGoal, day1, day2, subtask21]);

      // 1. In fullTree, week-goal has progress computed from its descendants
      expect(fullTree).toHaveLength(1);
      expect(fullTree[0].id).toBe('week-goal');
      expect(fullTree[0].progress).toBe(50); // day1 (100) + day2 (0) / 2 = 50%

      // 2. Project for Week view: week-goal appears as root, with its children intact
      const weekViewTree = projectTreeForView(fullTree, (i) => i.horizon === 'week');
      expect(weekViewTree).toHaveLength(1);
      expect(weekViewTree[0].id).toBe('week-goal');
      expect(weekViewTree[0].progress).toBe(50);
      expect(weekViewTree[0].children).toHaveLength(2);

      // 3. Project for Today view (2026-09-26): day1 and day2 appear as top-level roots
      // because their parent (week-goal) is outside the Today horizon
      const todayViewTree = projectTreeForView(
        fullTree,
        (i) => i.horizon === 'day' && i.period_start === '2026-09-26'
      );
      expect(todayViewTree).toHaveLength(2);
      expect(todayViewTree.map((n) => n.id)).toEqual(['day-1', 'day-2']);

      // Nested subtask-2-1 remains properly nested under day-2
      const day2Node = todayViewTree.find((n) => n.id === 'day-2')!;
      expect(day2Node.children).toHaveLength(1);
      expect(day2Node.children[0].id).toBe('subtask-2-1');
    });
  });
});

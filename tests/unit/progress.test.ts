import { describe, it, expect } from 'vitest';
import {
  calculateItemProgress,
  computeTreeProgress,
  calculateSiblingContribution,
} from '@/domain/progress';
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

describe('Progress Calculation Domain Logic (TDD)', () => {
  describe('Leaf Items', () => {
    it('evaluates incomplete leaf as 0%', () => {
      const item = createMockItem({ id: 'leaf-1', status: 'incomplete' });
      expect(calculateItemProgress(item, [])).toBe(0);
    });

    it('evaluates complete leaf as 100%', () => {
      const item = createMockItem({ id: 'leaf-2', status: 'complete' });
      expect(calculateItemProgress(item, [])).toBe(100);
    });

    it('evaluates cancelled leaf as 0%', () => {
      const item = createMockItem({ id: 'leaf-3', status: 'cancelled' });
      expect(calculateItemProgress(item, [])).toBe(0);
    });
  });

  describe('Parent Items with Direct Children', () => {
    it('calculates equal weight average by default', () => {
      const parent = createMockItem({ id: 'p1' });
      const children = [
        createMockItem({ id: 'c1', parent_id: 'p1', status: 'complete', weight: 1 }),
        createMockItem({ id: 'c2', parent_id: 'p1', status: 'incomplete', weight: 1 }),
      ];

      expect(calculateItemProgress(parent, children)).toBe(50);
    });

    it('calculates custom relative weights proportionally (e.g. weight 1 and 4)', () => {
      const parent = createMockItem({ id: 'p1' });
      const children = [
        createMockItem({ id: 'c1', parent_id: 'p1', status: 'complete', weight: 1 }), // contrib: 1 * 100
        createMockItem({ id: 'c2', parent_id: 'p1', status: 'incomplete', weight: 4 }), // contrib: 4 * 0
      ];

      // (100 + 0) / 5 = 20%
      expect(calculateItemProgress(parent, children)).toBe(20);
    });

    it('excludes cancelled children completely from progress numerator and denominator', () => {
      const parent = createMockItem({ id: 'p1' });
      const children = [
        createMockItem({ id: 'c1', parent_id: 'p1', status: 'complete', weight: 1 }),
        createMockItem({ id: 'c2', parent_id: 'p1', status: 'cancelled', weight: 3 }), // should be ignored
      ];

      // Active weight is only c1 (weight 1) -> 100%
      expect(calculateItemProgress(parent, children)).toBe(100);
    });

    it('evaluates safely to 0% when all children are cancelled or active weight is zero (no NaN / division-by-zero)', () => {
      const parent = createMockItem({ id: 'p1' });
      const children = [
        createMockItem({ id: 'c1', parent_id: 'p1', status: 'cancelled', weight: 1 }),
        createMockItem({ id: 'c2', parent_id: 'p1', status: 'cancelled', weight: 2 }),
      ];

      expect(calculateItemProgress(parent, children)).toBe(0);
    });
  });

  describe('Parent Manual Completion Override', () => {
    it('returns 100% when is_manually_completed is true, even with incomplete children', () => {
      const parent = createMockItem({
        id: 'p1',
        status: 'complete',
        is_manually_completed: true,
      });
      const children = [
        createMockItem({ id: 'c1', parent_id: 'p1', status: 'incomplete', weight: 1 }),
      ];

      expect(calculateItemProgress(parent, children)).toBe(100);
    });

    it('reverts to child-calculated progress when is_manually_completed is false', () => {
      const parent = createMockItem({
        id: 'p1',
        status: 'incomplete',
        is_manually_completed: false,
      });
      const children = [
        createMockItem({ id: 'c1', parent_id: 'p1', status: 'incomplete', weight: 1 }),
      ];

      expect(calculateItemProgress(parent, children)).toBe(0);
    });
  });

  describe('Recursive Multi-Level Propagation (computeTreeProgress)', () => {
    it('propagates child progress upward to parent and grandparent', () => {
      // Grandparent
      // ├── Parent (weight 1)
      // │   ├── Child 1 (complete, weight 1)
      // │   └── Child 2 (incomplete, weight 1)
      // └── Other Leaf (incomplete, weight 1)
      const child1 = createMockItem({ id: 'c1', parent_id: 'p1', status: 'complete', weight: 1 });
      const child2 = createMockItem({ id: 'c2', parent_id: 'p1', status: 'incomplete', weight: 1 });
      const otherLeaf = createMockItem({ id: 'other', parent_id: 'gp', status: 'incomplete', weight: 1 });
      const parent = createMockItem({ id: 'p1', parent_id: 'gp', weight: 1 });
      const grandparent = createMockItem({ id: 'gp', weight: 1 });

      const items = [grandparent, parent, child1, child2, otherLeaf];
      const progressMap = computeTreeProgress(items);

      // Child 1: 100%, Child 2: 0%
      expect(progressMap.get('c1')).toBe(100);
      expect(progressMap.get('c2')).toBe(0);

      // Parent: (100 + 0) / 2 = 50%
      expect(progressMap.get('p1')).toBe(50);

      // Other leaf: 0%
      expect(progressMap.get('other')).toBe(0);

      // Grandparent: (50 * 1 + 0 * 1) / 2 = 25%
      expect(progressMap.get('gp')).toBe(25);
    });

    it('calculates progress across different horizons (Year -> Month -> Week -> Day)', () => {
      const yearGoal = createMockItem({ id: 'year-1', horizon: 'year', period_start: '2026-01-01', period_end: '2026-12-31' });
      const monthGoal = createMockItem({ id: 'month-1', parent_id: 'year-1', horizon: 'month', period_start: '2026-09-01', period_end: '2026-09-30' });
      const weekGoal = createMockItem({ id: 'week-1', parent_id: 'month-1', horizon: 'week', period_start: '2026-09-21', period_end: '2026-09-27' });
      const day1 = createMockItem({ id: 'day-1', parent_id: 'week-1', horizon: 'day', period_start: '2026-09-26', status: 'complete' });
      const day2 = createMockItem({ id: 'day-2', parent_id: 'week-1', horizon: 'day', period_start: '2026-09-27', status: 'incomplete' });

      const items = [yearGoal, monthGoal, weekGoal, day1, day2];
      const progressMap = computeTreeProgress(items);

      expect(progressMap.get('day-1')).toBe(100);
      expect(progressMap.get('day-2')).toBe(0);
      expect(progressMap.get('week-1')).toBe(50);
      expect(progressMap.get('month-1')).toBe(50);
      expect(progressMap.get('year-1')).toBe(50);
    });
  });

  describe('calculateSiblingContribution (Progress Weight UX)', () => {
    it('returns null for root items without a parent', () => {
      const root = createMockItem({ id: 'root-1', parent_id: null });
      expect(calculateSiblingContribution('root-1', [root])).toBeNull();
    });

    it('calculates relative percentage contribution among active siblings (weights 1, 1, 4)', () => {
      const parent = createMockItem({ id: 'p' });
      const sibA = createMockItem({ id: 'a', parent_id: 'p', weight: 1 });
      const sibB = createMockItem({ id: 'b', parent_id: 'p', weight: 1 });
      const sibC = createMockItem({ id: 'c', parent_id: 'p', weight: 4 });
      const items = [parent, sibA, sibB, sibC];

      expect(calculateSiblingContribution('a', items)).toBe(16.7);
      expect(calculateSiblingContribution('b', items)).toBe(16.7);
      expect(calculateSiblingContribution('c', items)).toBe(66.7);
    });

    it('excludes cancelled siblings from contribution calculation', () => {
      const parent = createMockItem({ id: 'p' });
      const sibA = createMockItem({ id: 'a', parent_id: 'p', weight: 1 });
      const sibB = createMockItem({ id: 'b', parent_id: 'p', weight: 1 });
      const sibC = createMockItem({ id: 'c', parent_id: 'p', weight: 2, status: 'cancelled' });
      const items = [parent, sibA, sibB, sibC];

      expect(calculateSiblingContribution('a', items)).toBe(50);
      expect(calculateSiblingContribution('b', items)).toBe(50);
    });

    it('allows previewing contribution with a candidate targetWeight', () => {
      const parent = createMockItem({ id: 'p' });
      const sibA = createMockItem({ id: 'a', parent_id: 'p', weight: 1 });
      const sibB = createMockItem({ id: 'b', parent_id: 'p', weight: 1 });
      const items = [parent, sibA, sibB];

      // If weight of 'a' changes from 1 to 3, total becomes 4, so contribution is 75%
      expect(calculateSiblingContribution('a', items, 3)).toBe(75);
    });
  });
});

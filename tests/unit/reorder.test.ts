import { describe, it, expect } from 'vitest';
import { reorderSiblingList } from '@/domain/reorder';
import type { ItemRow } from '@/types/domain';

function createMockItem(id: string, sort_order: number): ItemRow {
  return {
    id,
    user_id: 'user-1',
    parent_id: null,
    title: `Item ${id}`,
    description: null,
    horizon: 'day',
    period_start: '2026-09-26',
    period_end: '2026-09-26',
    time: null,
    area_id: null,
    weight: 1,
    status: 'incomplete',
    is_manually_completed: false,
    sort_order,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

describe('Sibling Reordering Domain Math (TDD)', () => {
  it('reorders siblings and assigns sequential integer sort_orders', () => {
    const siblings = [
      createMockItem('A', 0),
      createMockItem('B', 1),
      createMockItem('C', 2),
    ];

    // Move 'C' (index 2) to the top (index 0)
    const result = reorderSiblingList(siblings, 2, 0);

    expect(result.map((item) => item.id)).toEqual(['C', 'A', 'B']);
    expect(result.map((item) => item.sort_order)).toEqual([0, 1, 2]);
  });

  it('moves item from top to bottom correctly', () => {
    const siblings = [
      createMockItem('A', 0),
      createMockItem('B', 1),
      createMockItem('C', 2),
    ];

    // Move 'A' (index 0) to bottom (index 2)
    const result = reorderSiblingList(siblings, 0, 2);

    expect(result.map((item) => item.id)).toEqual(['B', 'C', 'A']);
    expect(result.map((item) => item.sort_order)).toEqual([0, 1, 2]);
  });

  it('returns unchanged list if sourceIndex equals targetIndex', () => {
    const siblings = [createMockItem('A', 0), createMockItem('B', 1)];
    const result = reorderSiblingList(siblings, 1, 1);
    expect(result.map((item) => item.id)).toEqual(['A', 'B']);
    expect(result.map((item) => item.sort_order)).toEqual([0, 1]);
  });

  it('safely handles out-of-bounds indices', () => {
    const siblings = [createMockItem('A', 0), createMockItem('B', 1)];
    const result = reorderSiblingList(siblings, -1, 5);
    expect(result.map((item) => item.id)).toEqual(['A', 'B']);
  });
});

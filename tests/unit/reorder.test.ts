import { describe, it, expect } from 'vitest';
import {
  reorderSiblingList,
  findNodeAndSiblings,
  updateTreeWithReorderedSiblings,
} from '@/domain/reorder';
import type { ItemRow, ItemNode } from '@/types/domain';

function createMockNode(id: string, sort_order: number, parent_id: string | null = null, children: ItemNode[] = []): ItemNode {
  return {
    id,
    user_id: 'user-1',
    parent_id,
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
    progress: 0,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    children,
  };
}

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

  describe('Nested Sibling Reordering (T080)', () => {
    it('locates root nodes and their siblings correctly', () => {
      const tree = [
        createMockNode('root-1', 0),
        createMockNode('root-2', 1),
      ];

      const found = findNodeAndSiblings(tree, 'root-2');
      expect(found).not.toBeNull();
      expect(found!.parentNode).toBeNull();
      expect(found!.siblings.map((n) => n.id)).toEqual(['root-1', 'root-2']);
    });

    it('locates nested nodes and their immediate siblings with parentNode', () => {
      const child1 = createMockNode('c1', 0, 'root-1');
      const child2 = createMockNode('c2', 1, 'root-1');
      const root = createMockNode('root-1', 0, null, [child1, child2]);
      const tree = [root];

      const found = findNodeAndSiblings(tree, 'c2');
      expect(found).not.toBeNull();
      expect(found!.parentNode!.id).toBe('root-1');
      expect(found!.siblings.map((n) => n.id)).toEqual(['c1', 'c2']);
    });

    it('updates tree structure after reordering nested siblings', () => {
      const child1 = createMockNode('c1', 0, 'root-1');
      const child2 = createMockNode('c2', 1, 'root-1');
      const root = createMockNode('root-1', 0, null, [child1, child2]);
      const otherRoot = createMockNode('root-2', 1);
      const tree = [root, otherRoot];

      const reorderedChildren = [
        { ...child2, sort_order: 0 },
        { ...child1, sort_order: 1 },
      ];

      const updated = updateTreeWithReorderedSiblings(tree, 'root-1', reorderedChildren);
      expect(updated[0].children.map((c) => c.id)).toEqual(['c2', 'c1']);
      expect(updated[0].children.map((c) => c.sort_order)).toEqual([0, 1]);
      expect(updated[1].id).toBe('root-2'); // other branches unaffected
    });
  });
});

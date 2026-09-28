'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ItemRow } from '@/components/planner/item-row';
import { CompletionDialog } from '@/components/planner/completion-dialog';
import { ItemDetail } from '@/components/planner/item-detail';
import { createChildItem, resolveParentCompletion, reorderItems } from '@/app/(planner)/actions';
import {
  reorderSiblingList,
  findNodeAndSiblings,
  updateTreeWithReorderedSiblings,
} from '@/domain/reorder';
import { Plus, GripVertical } from 'lucide-react';
import type { ItemNode, AreaRow, ItemRow as ItemRowType, WeekDay } from '@/types/domain';

interface ItemTreeProps {
  nodes: ItemNode[];
  allItems?: ItemRowType[];
  areas?: AreaRow[];
  firstDayOfWeek?: WeekDay;
  onItemClick?: (item: ItemRowType) => void;
  onParentCompleteRequest?: (parent: ItemNode) => void;
}

interface SortableRowWrapperProps {
  id: string;
  children: (dragHandleProps: any) => React.ReactNode;
}

function SortableRowWrapper({ id, children }: SortableRowWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="relative flex items-center group">
      {/* Drag handle visible on touch/hover/focus */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        data-testid="drag-handle"
        aria-label="Drag to reorder"
        className="opacity-70 md:opacity-0 md:group-hover:opacity-60 md:focus:opacity-100 p-0.5 text-mutedText-light hover:text-primaryText-light dark:text-mutedText-dark dark:hover:text-primaryText-dark cursor-grab active:cursor-grabbing transition-opacity shrink-0"
        title="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex-1 min-w-0">
        {children({})}
      </div>
    </div>
  );
}

export function ItemTree({
  nodes,
  allItems = [],
  areas = [],
  firstDayOfWeek = 'monday',
  onItemClick,
  onParentCompleteRequest,
}: ItemTreeProps) {
  const [prevNodes, setPrevNodes] = useState(nodes);
  const [reorderedNodes, setReorderedNodes] = useState<ItemNode[] | null>(null);

  if (prevNodes !== nodes) {
    setPrevNodes(nodes);
    setReorderedNodes(null);
  }

  const items = reorderedNodes || nodes;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Parents start collapsed by default per DESIGN.md Calm Utility guidelines.
    // Only auto-expand contextual ancestor rows (shown when filtering by Area) so matching descendants are visible.
    const initial = new Set<string>();
    const collectContextAncestors = (list: ItemNode[]) => {
      list.forEach((item) => {
        if ((item as any).isContextRow && item.children && item.children.length > 0) {
          initial.add(item.id);
          collectContextAncestors(item.children);
        }
      });
    };
    collectContextAncestors(nodes);
    return initial;
  });

  const [activeChildParentId, setActiveChildParentId] = useState<string | null>(null);
  const [childTitle, setChildTitle] = useState('');
  const [parentToResolve, setParentToResolve] = useState<ItemNode | null>(null);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<ItemRowType | null>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  // Configure multi-input sensors for desktop mouse, mobile touch, and keyboard accessibility
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required to start drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // 150ms press delay avoids triggering drag on scroll
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleExpand = (itemId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleStartAddChild = (parent: ItemRowType) => {
    setActiveChildParentId(parent.id);
    setChildTitle('');
    setExpandedIds((prev) => new Set(prev).add(parent.id));
  };

  const submitChild = async (parentId: string, rawTitle: string) => {
    const clean = rawTitle.trim();
    if (!clean || isPending) return;

    setExpandedIds((prev) => new Set(prev).add(parentId));
    setIsPending(true);
    try {
      const res = await createChildItem(parentId, clean);
      if (res?.error) {
        console.error(res.error);
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChildTitle('');
      setActiveChildParentId(null);
      setExpandedIds((prev) => new Set(prev).add(parentId));
      setIsPending(false);
    }
  };

  const handleCreateChild = (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    submitChild(parentId, childTitle);
  };

  const handleParentComplete = (parent: ItemNode) => {
    if (onParentCompleteRequest) {
      onParentCompleteRequest(parent);
    } else {
      setParentToResolve(parent);
    }
  };

  const handleResolve = async (mode: 'parent_only' | 'all_descendants') => {
    if (!parentToResolve || isPending) return;
    setIsPending(true);
    try {
      await resolveParentCompletion(parentToResolve.id, mode);
      setParentToResolve(null);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsPending(false);
    }
  };

  // Same-parent nested sibling reordering (T080)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeInfo = findNodeAndSiblings(items, String(active.id));
    const overInfo = findNodeAndSiblings(items, String(over.id));

    if (!activeInfo || !overInfo) return;

    // Prohibit cross-parent dragging
    if (activeInfo.parentNode?.id !== overInfo.parentNode?.id) return;

    const siblings = activeInfo.siblings;
    const oldIndex = siblings.findIndex((i) => i.id === active.id);
    const newIndex = siblings.findIndex((i) => i.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const reorderedSiblings = reorderSiblingList(siblings, oldIndex, newIndex);
      const updatedTree = updateTreeWithReorderedSiblings(
        items,
        activeInfo.parentNode?.id || null,
        reorderedSiblings
      );
      setReorderedNodes(updatedTree);

      // Persist sequential sort_orders via server action
      setIsPending(true);
      reorderItems(
        reorderedSiblings.map((item) => ({
          id: item.id,
          sort_order: item.sort_order,
        }))
      )
        .then(() => router.refresh())
        .finally(() => setIsPending(false));
    }
  };

  const handleRowClick = (item: ItemRowType) => {
    if (onItemClick) {
      onItemClick(item);
    } else {
      setSelectedItemForDetail(item);
    }
  };

  const renderNodes = (list: ItemNode[], indent = 0): React.ReactNode => {
    return list.map((node) => {
      const isExpanded = expandedIds.has(node.id);
      const isAddingChild = activeChildParentId === node.id;
      const isContextRow = (node as any).isContextRow ?? false;

      return (
        <React.Fragment key={node.id}>
          <SortableRowWrapper id={node.id}>
            {() => (
              <ItemRow
                item={node}
                areas={areas}
                isContextRow={isContextRow}
                isExpanded={isExpanded}
                indent={indent}
                onItemClick={handleRowClick}
                onToggleExpand={toggleExpand}
                onAddChild={handleStartAddChild}
                onParentCompleteRequest={handleParentComplete}
              />
            )}
          </SortableRowWrapper>

          {isAddingChild && (
            <form
              onSubmit={(e) => handleCreateChild(e, node.id)}
              style={{ paddingLeft: `${(indent + 1) * 20 + 20}px` }}
              className="flex items-center gap-2 py-1.5 px-2.5 bg-[#FAF9F5] dark:bg-[#202020] border-b border-border-light/40 dark:border-border-dark/40"
            >
              <Plus className="h-3.5 w-3.5 text-accent shrink-0" />
              <input
                type="text"
                data-testid="inline-child-input"
                autoFocus
                value={childTitle}
                onChange={(e) => setChildTitle(e.target.value)}
                placeholder="New subtask title... (press Enter)"
                className="flex-1 bg-transparent text-xs text-primaryText-light dark:text-primaryText-dark placeholder:text-mutedText-light dark:placeholder:text-mutedText-dark focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitChild(node.id, e.currentTarget.value || childTitle);
                  } else if (e.key === 'Escape') {
                    setActiveChildParentId(null);
                    setChildTitle('');
                  }
                }}
              />
              <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveChildParentId(null);
                  setChildTitle('');
                }}
                className="text-[11px] text-mutedText-light hover:text-primaryText-light dark:text-mutedText-dark dark:hover:text-primaryText-dark px-1"
              >
                Cancel
              </button>
            </form>
          )}

          {isExpanded && (
            <div>
              {node.children && node.children.length > 0 && (
                <SortableContext
                  items={node.children.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {renderNodes(node.children, indent + 1)}
                </SortableContext>
              )}
              {/* Touch-discoverable Add Subtask button when expanded (T072) */}
              {!isAddingChild && !isContextRow && (
                <div
                  style={{ paddingLeft: `${(indent + 1) * 20 + 24}px` }}
                  className="py-1 border-b border-border-light/20 last:border-b-0 dark:border-border-dark/20"
                >
                  <button
                    type="button"
                    data-testid="expanded-add-subtask-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartAddChild(node);
                    }}
                    className="flex items-center gap-1.5 text-[11px] text-mutedText-light hover:text-accent dark:text-mutedText-dark dark:hover:text-accent transition-colors cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add subtask</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </React.Fragment>
      );
    });
  };

  // Flatten tree for candidate parent lookup if allItems not explicitly provided
  const flattenNodes = (tree: ItemNode[]): ItemRowType[] => {
    const flat: ItemRowType[] = [];
    const traverse = (arr: ItemNode[]) => {
      arr.forEach((n) => {
        flat.push(n);
        if (n.children && n.children.length > 0) traverse(n.children);
      });
    };
    traverse(nodes);
    return flat;
  };

  const candidateItems = allItems && allItems.length > 0 ? allItems : flattenNodes(nodes);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="rounded border border-border-light bg-surface-light shadow-sm dark:border-border-dark dark:bg-surface-dark overflow-hidden">
            {renderNodes(items)}
          </div>
        </SortableContext>
      </DndContext>

      {/* Completion Dialog */}
      <CompletionDialog
        parent={parentToResolve}
        open={Boolean(parentToResolve)}
        onOpenChange={(open) => !open && setParentToResolve(null)}
        onResolve={handleResolve}
      />

      {/* Item Detail Drawer / Sheet */}
      <ItemDetail
        item={selectedItemForDetail}
        allItems={candidateItems}
        areas={areas}
        firstDayOfWeek={firstDayOfWeek}
        open={Boolean(selectedItemForDetail)}
        onOpenChange={(open) => !open && setSelectedItemForDetail(null)}
      />
    </>
  );
}

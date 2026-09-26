'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
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
import { reorderSiblingList } from '@/domain/reorder';
import { Plus, GripVertical } from 'lucide-react';
import type { ItemNode, AreaRow, ItemRow as ItemRowType } from '@/types/domain';

interface ItemTreeProps {
  nodes: ItemNode[];
  areas?: AreaRow[];
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
      {/* Subtle drag handle visible on hover / touch */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        data-testid="drag-handle"
        className="opacity-0 group-hover:opacity-60 focus:opacity-100 p-0.5 text-mutedText-light hover:text-primaryText-light cursor-grab active:cursor-grabbing transition-opacity shrink-0"
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
  areas = [],
  onItemClick,
  onParentCompleteRequest,
}: ItemTreeProps) {
  const [items, setItems] = useState<ItemNode[]>(nodes);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    const collect = (list: ItemNode[]) => {
      list.forEach((item) => {
        if (item.children && item.children.length > 0) {
          initial.add(item.id);
          collect(item.children);
        }
      });
    };
    collect(nodes);
    return initial;
  });

  const [activeChildParentId, setActiveChildParentId] = useState<string | null>(null);
  const [childTitle, setChildTitle] = useState('');
  const [parentToResolve, setParentToResolve] = useState<ItemNode | null>(null);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<ItemRowType | null>(null);
  const [isPending, startTransition] = useTransition();

  React.useEffect(() => {
    setItems(nodes);
  }, [nodes]);

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

  const handleCreateChild = (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!childTitle.trim() || isPending) return;

    startTransition(async () => {
      await createChildItem(parentId, childTitle.trim());
      setChildTitle('');
      setActiveChildParentId(null);
    });
  };

  const handleParentComplete = (parent: ItemNode) => {
    if (onParentCompleteRequest) {
      onParentCompleteRequest(parent);
    } else {
      setParentToResolve(parent);
    }
  };

  const handleResolve = (mode: 'parent_only' | 'all_descendants') => {
    if (!parentToResolve) return;
    startTransition(async () => {
      await resolveParentCompletion(parentToResolve.id, mode);
      setParentToResolve(null);
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = reorderSiblingList(items, oldIndex, newIndex);
      setItems(reordered);

      // Persist new sort_order integers via Server Action
      startTransition(async () => {
        await reorderItems(
          reordered.map((item) => ({
            id: item.id,
            sort_order: item.sort_order,
          }))
        );
      });
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
                disabled={isPending}
                className="flex-1 bg-transparent text-xs text-primaryText-light dark:text-primaryText-dark placeholder:text-mutedText-light focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setActiveChildParentId(null);
                    setChildTitle('');
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setActiveChildParentId(null);
                  setChildTitle('');
                }}
                className="text-[11px] text-mutedText-light hover:text-primaryText-light px-1"
              >
                Cancel
              </button>
            </form>
          )}

          {isExpanded && node.children && node.children.length > 0 && (
            <div>{renderNodes(node.children, indent + 1)}</div>
          )}
        </React.Fragment>
      );
    });
  };

  // Extract flat list of all nodes for candidate parent lookup in detail drawer
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
        allItems={flattenNodes(nodes)}
        areas={areas}
        open={Boolean(selectedItemForDetail)}
        onOpenChange={(open) => !open && setSelectedItemForDetail(null)}
      />
    </>
  );
}

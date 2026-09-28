'use client';

import * as React from 'react';
import { useTransition } from 'react';
import { ChevronRight, ChevronDown, Plus, Clock, Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toggleItemCompletion, reopenParent } from '@/app/(planner)/actions';
import { getAreaColor } from '@/domain/areas';
import { cn } from '@/lib/utils';
import type { ItemNode, AreaRow, ItemRow as ItemRowType } from '@/types/domain';

interface ItemRowProps {
  item: ItemNode;
  areas?: AreaRow[];
  isContextRow?: boolean;
  isExpanded?: boolean;
  indent?: number;
  onItemClick?: (item: ItemRowType) => void;
  onToggleExpand?: (itemId: string) => void;
  onAddChild?: (parent: ItemRowType) => void;
  onParentCompleteRequest?: (parent: ItemNode) => void;
}

function hasIncompleteDescendants(node: ItemNode): boolean {
  if (!node.children || node.children.length === 0) return false;
  return node.children.some(
    (c) => c.status === 'incomplete' || hasIncompleteDescendants(c)
  );
}

export function ItemRow({
  item,
  areas = [],
  isContextRow = false,
  isExpanded = false,
  indent = 0,
  onItemClick,
  onToggleExpand,
  onAddChild,
  onParentCompleteRequest,
}: ItemRowProps) {
  const [isPending, startTransition] = useTransition();

  const [optimisticStatus, setOptimisticStatus] = React.useOptimistic(
    item.status,
    (_current, next: import('@/types/domain').ItemStatus) => next
  );
  const [optimisticManual, setOptimisticManual] = React.useOptimistic(
    item.is_manually_completed,
    (_current, next: boolean) => next
  );

  const isComplete = optimisticStatus === 'complete';
  const hasChildren = item.children && item.children.length > 0;
  const area = areas.find((a) => a.id === item.area_id);

  const lastToggleRef = React.useRef(0);

  const performToggle = () => {
    const now = Date.now();
    if (now - lastToggleRef.current < 400) return;
    lastToggleRef.current = now;

    // If unchecking a completed parent
    if (isComplete) {
      startTransition(async () => {
        setOptimisticStatus('incomplete');
        setOptimisticManual(false);
        if (item.is_manually_completed) {
          await reopenParent(item.id);
        } else {
          await toggleItemCompletion(item.id, item.status);
        }
      });
      return;
    }

    // If parent with uncompleted descendants at any depth, trigger 3-option prompt (T082)
    if (hasChildren && !isComplete && onParentCompleteRequest) {
      if (hasIncompleteDescendants(item)) {
        onParentCompleteRequest(item);
        return;
      }
    }

    startTransition(async () => {
      setOptimisticStatus('complete');
      await toggleItemCompletion(item.id, item.status);
    });
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    performToggle();
  };

  const handleCheckedChange = () => {
    performToggle();
  };

  return (
    <div
      data-testid="item-row"
      onClick={() => onItemClick?.(item)}
      style={{ paddingLeft: `${indent * 20}px` }}
      className={cn(
        'group flex items-center justify-between rounded px-2.5 py-1.5 transition-colors cursor-pointer border-b border-border-light/40 last:border-b-0 dark:border-border-dark/40',
        isContextRow
          ? 'opacity-40 bg-transparent'
          : 'hover:bg-[#F5F5F0] dark:hover:bg-[#252525]',
        isComplete && !isContextRow && 'opacity-65'
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {/* Chevron disclosure toggle */}
        {hasChildren ? (
          <button
            type="button"
            data-testid="disclosure-chevron"
            aria-label={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.(item.id);
            }}
            className="p-0.5 text-mutedText-light hover:text-primaryText-light dark:text-mutedText-dark dark:hover:text-primaryText-dark transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {/* Completion checkbox */}
        <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isComplete}
            disabled={isContextRow}
            onClick={handleCheckboxClick}
            onCheckedChange={handleCheckedChange}
          />
        </div>

        {/* Title */}
        <span
          className={cn(
            'text-xs truncate transition-all text-primaryText-light dark:text-primaryText-dark',
            isComplete && 'line-through text-mutedText-light dark:text-mutedText-dark'
          )}
        >
          {item.title}
        </span>

        {/* Time badge for Day items */}
        {item.time && (
          <span className="flex items-center gap-1 rounded bg-[#EBF2F7] dark:bg-[#1E2D3D] px-1.5 py-0.2 text-[10px] font-medium text-accent shrink-0">
            <Clock className="h-2.5 w-2.5" />
            <span>{item.time}</span>
          </span>
        )}

        {/* Area indicator */}
        {area && (
          <span className="flex items-center gap-1 text-[11px] text-mutedText-light dark:text-mutedText-dark shrink-0">
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: getAreaColor(area.color_token) }}
            />
            <span className="truncate max-w-[80px]">{area.name}</span>
          </span>
        )}

        {/* Manual completion badge */}
        {optimisticManual && (
          <span className="rounded bg-accent/10 text-accent px-1.5 py-0.2 text-[10px] font-medium">
            Manual
          </span>
        )}
      </div>

      {/* Progress & Actions */}
      <div className="flex items-center gap-2 shrink-0 ml-2">
        {hasChildren && !isComplete && (
          <span className="text-[11px] text-mutedText-light dark:text-mutedText-dark font-mono">
            {Math.round(item.progress || 0)}%
          </span>
        )}

        {/* Add Child button: touch-visible on mobile, revealed on hover/focus on desktop */}
        {!isContextRow && (
          <button
            type="button"
            data-testid="add-subtask-btn"
            aria-label="Add subtask"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild?.(item);
            }}
            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 p-1 text-mutedText-light hover:text-accent dark:text-mutedText-dark dark:hover:text-accent transition-opacity rounded cursor-pointer"
            title="Add subtask"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

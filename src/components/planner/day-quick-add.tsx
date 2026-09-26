'use client';

import * as React from 'react';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { QuickAdd } from '@/components/planner/quick-add';
import type { AreaRow, ItemRow } from '@/types/domain';

interface DayQuickAddProps {
  dateStr: string;
  dayLabel: string;
  areas?: AreaRow[];
  candidateParents?: ItemRow[];
  defaultAreaId?: string | null;
}

export function DayQuickAdd({
  dateStr,
  dayLabel,
  areas = [],
  candidateParents = [],
  defaultAreaId = null,
}: DayQuickAddProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button
        type="button"
        data-testid={`add-day-task-btn-${dateStr}`}
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-[11px] text-mutedText-light hover:text-accent dark:text-mutedText-dark dark:hover:text-accent transition-colors pt-1 cursor-pointer"
      >
        <Plus className="h-3 w-3" />
        <span>Add task</span>
      </button>
    );
  }

  return (
    <div className="pt-1 space-y-1">
      <QuickAdd
        defaultHorizon="day"
        defaultPeriodStart={dateStr}
        defaultPeriodEnd={dateStr}
        defaultAreaId={defaultAreaId}
        areas={areas}
        candidateParents={candidateParents}
        placeholder={`Add task for ${dayLabel}... (press Enter)`}
        onItemCreated={() => setIsOpen(false)}
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-[10px] text-mutedText-light hover:text-primaryText-light dark:text-mutedText-dark dark:hover:text-primaryText-dark"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

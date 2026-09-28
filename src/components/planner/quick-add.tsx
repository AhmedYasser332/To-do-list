'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Clock, X, SlidersHorizontal } from 'lucide-react';
import { createItem } from '@/app/(planner)/actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Horizon, AreaRow, ItemRow } from '@/types/domain';

interface QuickAddProps {
  defaultHorizon?: Horizon;
  defaultPeriodStart?: string | null;
  defaultPeriodEnd?: string | null;
  defaultAreaId?: string | null;
  parentId?: string | null;
  areas?: AreaRow[];
  candidateParents?: ItemRow[];
  placeholder?: string;
  onItemCreated?: () => void;
}

export function QuickAdd({
  defaultHorizon = 'inbox',
  defaultPeriodStart = null,
  defaultPeriodEnd = null,
  defaultAreaId = null,
  parentId = null,
  areas = [],
  candidateParents = [],
  placeholder = 'What needs doing? Press Enter to add...',
  onItemCreated,
}: QuickAddProps) {
  const [title, setTitle] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string>(defaultAreaId || '');
  const [selectedParentId, setSelectedParentId] = useState<string>(parentId || '');
  const [showTime, setShowTime] = useState(false);
  const [time, setTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDayHorizon = defaultHorizon === 'day';
  const hasAdvancedOptions = areas.length > 0 || candidateParents.length > 0 || isDayHorizon;

  // Sync if defaultAreaId or parentId prop changes
  React.useEffect(() => {
    if (defaultAreaId !== undefined) {
      setSelectedAreaId(defaultAreaId || '');
    }
  }, [defaultAreaId]);

  React.useEffect(() => {
    if (parentId !== undefined) {
      setSelectedParentId(parentId || '');
    }
  }, [parentId]);

  const submitWithTitle = async (rawTitle: string, overrideTime?: string) => {
    const cleanTitle = rawTitle.trim();
    if (!cleanTitle || isPending) return;

    const targetTime = overrideTime !== undefined ? overrideTime : time;

    setError(null);
    setIsPending(true);
    try {
      const res = await createItem({
        title: cleanTitle,
        horizon: defaultHorizon,
        periodStart: defaultPeriodStart,
        periodEnd: defaultPeriodEnd,
        time: isDayHorizon && (showTime || targetTime) && targetTime ? targetTime : null,
        areaId: selectedAreaId || defaultAreaId || null,
        parentId: selectedParentId || parentId || null,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        setTitle('');
        setTime('');
        setShowTime(false);
        setShowOptions(false);
        onItemCreated?.();
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create item');
    } finally {
      setIsPending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const inputEl = form?.elements?.namedItem('title') as HTMLInputElement | null;
    const timeEl = form?.elements?.namedItem('time') as HTMLInputElement | null;
    const resolvedTitle = (inputEl?.value || title).trim();
    const resolvedTime = timeEl?.value !== undefined ? timeEl.value : time;
    submitWithTitle(resolvedTitle, resolvedTime);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-1.5">
      <div className="flex items-center gap-2 rounded border border-border-light bg-surface-light px-3 py-1.5 shadow-sm focus-within:ring-1 focus-within:ring-accent dark:border-border-dark dark:bg-surface-dark">
        <Plus className="h-4 w-4 text-mutedText-light dark:text-mutedText-dark shrink-0" />
        <input
          type="text"
          name="title"
          data-testid="quick-add-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submitWithTitle(e.currentTarget.value || title);
            }
          }}
          placeholder={placeholder}
          disabled={!mounted || isPending}
          className="flex-1 bg-transparent text-sm text-primaryText-light dark:text-primaryText-dark placeholder:text-mutedText-light focus:outline-none dark:placeholder:text-mutedText-dark"
        />

        {/* Optional quick time button for Day items */}
        {isDayHorizon && !showOptions && (
          <div className="flex items-center gap-1.5 shrink-0">
            {!showTime ? (
              <button
                type="button"
                data-testid="quick-add-time-toggle"
                onClick={() => {
                  setShowTime(true);
                  setShowOptions(true);
                }}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-mutedText-light hover:bg-[#F2F2EE] hover:text-primaryText-light transition-colors dark:text-mutedText-dark dark:hover:bg-[#2A2A2A] dark:hover:text-primaryText-dark cursor-pointer"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>+ Time</span>
              </button>
            ) : null}
          </div>
        )}

        {/* Toggle optional creation controls (T073) */}
        {hasAdvancedOptions && (
          <button
            type="button"
            data-testid="quick-add-options-toggle"
            aria-label="Toggle creation options"
            onClick={() => setShowOptions(!showOptions)}
            className={cn(
              'p-1 rounded text-mutedText-light hover:text-primaryText-light dark:text-mutedText-dark dark:hover:text-primaryText-dark transition-colors cursor-pointer',
              showOptions && 'text-accent dark:text-accent bg-accent/10'
            )}
            title="Toggle Area/Parent/Time options"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        )}

        <Button
          type="submit"
          size="sm"
          data-testid="quick-add-submit-btn"
          disabled={!mounted || !title.trim() || isPending}
          className="h-7 px-2.5 text-xs"
        >
          {isPending ? 'Adding...' : 'Add'}
        </Button>
      </div>

      {/* Compact progressive disclosure toolbar (T073) */}
      {showOptions && hasAdvancedOptions && (
        <div
          data-testid="quick-add-options-panel"
          className="flex flex-wrap items-center gap-2 px-2 py-1.5 rounded border border-border-light/60 bg-[#FAF9F5] dark:border-border-dark/60 dark:bg-[#1C1C1C] text-xs"
        >
          {/* Optional Area */}
          {areas.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-mutedText-light dark:text-mutedText-dark">Area:</span>
              <select
                data-testid="quick-add-area-select"
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                className="rounded border border-border-light bg-surface-light px-2 py-0.5 text-xs text-primaryText-light dark:border-border-dark dark:bg-surface-dark dark:text-primaryText-dark focus:outline-none"
              >
                <option value="">(No Area)</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Optional Parent */}
          {candidateParents.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-mutedText-light dark:text-mutedText-dark">Parent:</span>
              <select
                data-testid="quick-add-parent-select"
                value={selectedParentId}
                onChange={(e) => setSelectedParentId(e.target.value)}
                className="max-w-[160px] truncate rounded border border-border-light bg-surface-light px-2 py-0.5 text-xs text-primaryText-light dark:border-border-dark dark:bg-surface-dark dark:text-primaryText-dark focus:outline-none"
              >
                <option value="">(No Parent)</option>
                {candidateParents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Optional Time for Day items */}
          {isDayHorizon && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-mutedText-light dark:text-mutedText-dark">Time:</span>
              <input
                type="time"
                name="time"
                data-testid="quick-add-time-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="rounded border border-border-light bg-surface-light px-1.5 py-0.5 text-xs text-primaryText-light dark:border-border-dark dark:bg-surface-dark dark:text-primaryText-dark focus:outline-none"
              />
              {time && (
                <button
                  type="button"
                  onClick={() => setTime('')}
                  className="text-mutedText-light hover:text-red-500 dark:text-mutedText-dark dark:hover:text-red-400 p-0.5"
                  title="Clear time"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 px-1">{error}</p>
      )}
    </form>
  );
}

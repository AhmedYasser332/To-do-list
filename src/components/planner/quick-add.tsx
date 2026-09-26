'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { Plus, Clock, X } from 'lucide-react';
import { createItem } from '@/app/(planner)/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Horizon } from '@/types/domain';

interface QuickAddProps {
  defaultHorizon?: Horizon;
  defaultPeriodStart?: string | null;
  defaultPeriodEnd?: string | null;
  defaultAreaId?: string | null;
  parentId?: string | null;
  placeholder?: string;
  onItemCreated?: () => void;
}

export function QuickAdd({
  defaultHorizon = 'inbox',
  defaultPeriodStart = null,
  defaultPeriodEnd = null,
  defaultAreaId = null,
  parentId = null,
  placeholder = 'What needs doing? Press Enter to add...',
  onItemCreated,
}: QuickAddProps) {
  const [title, setTitle] = useState('');
  const [showTime, setShowTime] = useState(false);
  const [time, setTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDayHorizon = defaultHorizon === 'day';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isPending) return;

    setError(null);
    startTransition(async () => {
      const res = await createItem({
        title: title.trim(),
        horizon: defaultHorizon,
        periodStart: defaultPeriodStart,
        periodEnd: defaultPeriodEnd,
        time: isDayHorizon && showTime && time ? time : null,
        areaId: defaultAreaId,
        parentId,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        setTitle('');
        setTime('');
        setShowTime(false);
        onItemCreated?.();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-2">
      <div className="flex items-center gap-2 rounded border border-border-light bg-surface-light px-3 py-1.5 shadow-sm focus-within:ring-1 focus-within:ring-accent dark:border-border-dark dark:bg-surface-dark">
        <Plus className="h-4 w-4 text-mutedText-light dark:text-mutedText-dark shrink-0" />
        <input
          type="text"
          data-testid="quick-add-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder}
          disabled={isPending}
          className="flex-1 bg-transparent text-sm placeholder:text-mutedText-light focus:outline-none dark:placeholder:text-mutedText-dark"
        />

        {/* Optional Time Affordance for Day items */}
        {isDayHorizon && (
          <div className="flex items-center gap-1.5 shrink-0">
            {!showTime ? (
              <button
                type="button"
                data-testid="quick-add-time-toggle"
                onClick={() => setShowTime(true)}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-mutedText-light hover:bg-[#F2F2EE] hover:text-primaryText-light transition-colors dark:text-mutedText-dark dark:hover:bg-[#2A2A2A] dark:hover:text-primaryText-dark"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>+ Time</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-[#F2F2EE] dark:bg-[#2A2A2A] rounded px-1.5 py-0.5">
                <input
                  type="time"
                  data-testid="quick-add-time-input"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-transparent text-xs text-primaryText-light dark:text-primaryText-dark focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowTime(false);
                    setTime('');
                  }}
                  className="text-mutedText-light hover:text-red-500 dark:text-mutedText-dark dark:hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}

        <Button
          type="submit"
          size="sm"
          disabled={!title.trim() || isPending}
          className="h-7 px-2.5 text-xs"
        >
          {isPending ? 'Adding...' : 'Add'}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 px-1">{error}</p>
      )}
    </form>
  );
}

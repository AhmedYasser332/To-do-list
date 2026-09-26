import * as React from 'react';
import { cn } from '@/lib/utils';

export function LoadingSkeleton({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      data-testid="loading-skeleton"
      className={cn(
        'rounded border border-border-light bg-surface-light p-2 shadow-sm dark:border-border-dark dark:bg-surface-dark space-y-2',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-2 py-2 animate-pulse border-b border-border-light/30 last:border-b-0 dark:border-border-dark/30"
        >
          <div className="h-4 w-4 rounded-full bg-border-light/60 dark:bg-border-dark/60 shrink-0" />
          <div
            className="h-3 rounded bg-border-light/60 dark:bg-border-dark/60"
            style={{ width: `${40 + (i % 3) * 20}%` }}
          />
        </div>
      ))}
    </div>
  );
}

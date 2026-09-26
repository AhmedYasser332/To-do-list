import * as React from 'react';
import { LoadingSkeleton } from '@/components/planner/loading-skeleton';

export default function PlannerLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1 border-b border-border-light pb-4 dark:border-border-dark">
        <div className="h-6 w-32 rounded bg-border-light/60 dark:bg-border-dark/60 animate-pulse" />
        <div className="h-3 w-48 rounded bg-border-light/40 dark:bg-border-dark/40 animate-pulse mt-1" />
      </div>

      <div className="h-10 rounded border border-border-light/60 bg-surface-light/60 dark:border-border-dark/60 dark:bg-surface-dark/60 animate-pulse" />

      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-border-light/60 dark:bg-border-dark/60 animate-pulse" />
        <LoadingSkeleton count={4} />
      </div>
    </div>
  );
}

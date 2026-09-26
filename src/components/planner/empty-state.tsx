import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-testid="empty-state"
      className={cn(
        'flex flex-col items-center justify-center rounded border border-dashed border-border-light p-8 text-center dark:border-border-dark',
        className
      )}
    >
      {Icon && (
        <div className="mb-3 rounded-full bg-border-light/30 p-2.5 text-mutedText-light dark:bg-border-dark/30 dark:text-mutedText-dark">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <h3 className="text-xs font-semibold text-primaryText-light dark:text-primaryText-dark">
        {title}
      </h3>
      <p className="mt-1 text-[11px] text-mutedText-light dark:text-mutedText-dark max-w-sm">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

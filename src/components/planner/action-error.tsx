import * as React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ActionErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ActionError({ message, onRetry, className }: ActionErrorProps) {
  return (
    <div
      data-testid="action-error"
      className={cn(
        'flex items-center justify-between rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        <span>{message}</span>
      </div>

      {onRetry && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="h-6 px-2 text-[11px] gap-1 border-red-300 bg-white/70 hover:bg-white text-red-800 dark:border-red-800 dark:bg-transparent dark:text-red-300"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Retry</span>
        </Button>
      )}
    </div>
  );
}

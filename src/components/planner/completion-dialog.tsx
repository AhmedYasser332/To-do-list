'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ItemNode } from '@/types/domain';

interface CompletionDialogProps {
  parent: ItemNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (mode: 'parent_only' | 'all_descendants') => void;
}

export function CompletionDialog({
  parent,
  open,
  onOpenChange,
  onResolve,
}: CompletionDialogProps) {
  if (!parent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="completion-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete parent item?</DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-primaryText-light dark:text-primaryText-dark">
              &ldquo;{parent.title}&rdquo;
            </span>{' '}
            contains incomplete subtasks. Choose how to mark it complete:
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            type="button"
            data-testid="complete-parent-only-btn"
            variant="outline"
            className="flex flex-col items-start h-auto py-2.5 px-3 text-left"
            onClick={() => onResolve('parent_only')}
          >
            <span className="font-medium text-xs text-primaryText-light dark:text-primaryText-dark">
              Complete parent only
            </span>
            <span className="text-[11px] text-mutedText-light dark:text-mutedText-dark font-normal">
              Parent displays 100% with a manual badge. Descendants preserve their current state.
            </span>
          </Button>

          <Button
            type="button"
            data-testid="complete-all-descendants-btn"
            variant="default"
            className="flex flex-col items-start h-auto py-2.5 px-3 text-left"
            onClick={() => onResolve('all_descendants')}
          >
            <span className="font-medium text-xs text-white">
              Complete parent and all descendants
            </span>
            <span className="text-[11px] text-white/80 font-normal">
              Parent and all nested subtasks at every depth will be marked complete.
            </span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            data-testid="completion-cancel-btn"
            className="mt-1 text-xs"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

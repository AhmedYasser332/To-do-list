'use client';

import * as React from 'react';
import { useState, useEffect, useTransition } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { updateItemDetails, deleteItemSubtree } from '@/app/(planner)/actions';
import { Trash2, AlertCircle, Ban, RotateCcw } from 'lucide-react';
import type { ItemRow, AreaRow, Horizon, ItemStatus } from '@/types/domain';

interface ItemDetailProps {
  item: ItemRow | null;
  allItems?: ItemRow[];
  areas?: AreaRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemUpdated?: () => void;
  onItemDeleted?: () => void;
}

export function ItemDetail({
  item,
  allItems = [],
  areas = [],
  open,
  onOpenChange,
  onItemUpdated,
  onItemDeleted,
}: ItemDetailProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [horizon, setHorizon] = useState<Horizon>('inbox');
  const [periodStart, setPeriodStart] = useState('');
  const [time, setTime] = useState('');
  const [areaId, setAreaId] = useState<string>('');
  const [weight, setWeight] = useState('1');
  const [parentId, setParentId] = useState<string>('');
  const [status, setStatus] = useState<ItemStatus>('incomplete');

  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || '');
      setHorizon(item.horizon);
      setPeriodStart(item.period_start || '');
      setTime(item.time || '');
      setAreaId(item.area_id || '');
      setWeight(String(item.weight || 1));
      setParentId(item.parent_id || '');
      setStatus(item.status);
      setError(null);
    }
  }, [item]);

  if (!item) return null;

  // Calculate direct and indirect descendant count for deletion prompt
  const directChildren = allItems.filter((i) => i.parent_id === item.id);
  const childCount = directChildren.length;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isPending) return;

    setError(null);
    startTransition(async () => {
      const res = await updateItemDetails(item.id, {
        title: title.trim(),
        description: description.trim() || null,
        horizon,
        periodStart: horizon === 'inbox' ? null : periodStart || null,
        periodEnd: horizon === 'inbox' ? null : periodStart || null,
        time: horizon === 'day' && time ? time : null,
        areaId: areaId || null,
        weight: parseFloat(weight) || 1,
        parentId: parentId || null,
        status,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        onItemUpdated?.();
      }
    });
  };

  const handleCancelStatus = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateItemDetails(item.id, { status: 'cancelled' });
      if (res?.error) {
        setError(res.error);
      } else {
        setStatus('cancelled');
        onItemUpdated?.();
      }
    });
  };

  const handleReopenStatus = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateItemDetails(item.id, { status: 'incomplete' });
      if (res?.error) {
        setError(res.error);
      } else {
        setStatus('incomplete');
        onItemUpdated?.();
      }
    });
  };

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteItemSubtree(item.id);
      if (res?.error) {
        setError(res.error);
      } else {
        setShowDeleteConfirm(false);
        onOpenChange(false);
        onItemDeleted?.();
      }
    });
  };

  // Candidate parents: exclude self
  const candidateParents = allItems.filter((i) => i.id !== item.id);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          data-testid="item-detail-drawer"
          side="right"
          className="w-full sm:max-w-md overflow-y-auto"
        >
          <SheetHeader className="mb-4">
            <div className="flex items-center justify-between pr-6">
              <SheetTitle>Item Details</SheetTitle>
              <span className="text-[11px] font-medium uppercase tracking-wider text-mutedText-light dark:text-mutedText-dark px-2 py-0.5 rounded bg-border-light/30 dark:bg-border-dark/30">
                {status}
              </span>
            </div>
            <SheetDescription>View and edit task properties</SheetDescription>
          </SheetHeader>

          {error && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 flex items-start gap-1.5 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-primaryText-light dark:text-primaryText-dark mb-1">
                Title
              </label>
              <Input
                data-testid="detail-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPending}
                required
                className="text-xs"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-primaryText-light dark:text-primaryText-dark mb-1">
                Notes / Description
              </label>
              <Textarea
                data-testid="detail-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes or details..."
                disabled={isPending}
                className="text-xs min-h-[70px]"
              />
            </div>

            {/* Horizon & Period */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-primaryText-light dark:text-primaryText-dark mb-1">
                  Horizon
                </label>
                <select
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value as Horizon)}
                  disabled={isPending}
                  className="w-full rounded border border-border-light bg-surface-light px-2.5 py-1.5 text-xs text-primaryText-light dark:border-border-dark dark:bg-surface-dark dark:text-primaryText-dark focus:outline-none"
                >
                  <option value="inbox">Inbox</option>
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-primaryText-light dark:text-primaryText-dark mb-1">
                  Area
                </label>
                <select
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded border border-border-light bg-surface-light px-2.5 py-1.5 text-xs text-primaryText-light dark:border-border-dark dark:bg-surface-dark dark:text-primaryText-dark focus:outline-none"
                >
                  <option value="">(No Area)</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date & Time (for Day horizon) */}
            {horizon === 'day' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-primaryText-light dark:text-primaryText-dark mb-1">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    disabled={isPending}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-primaryText-light dark:text-primaryText-dark mb-1">
                    Time (Optional)
                  </label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    disabled={isPending}
                    className="text-xs"
                  />
                </div>
              </div>
            )}

            {/* Parent & Weight */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-primaryText-light dark:text-primaryText-dark mb-1">
                  Parent Item
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded border border-border-light bg-surface-light px-2.5 py-1.5 text-xs text-primaryText-light dark:border-border-dark dark:bg-surface-dark dark:text-primaryText-dark focus:outline-none"
                >
                  <option value="">(None - Root Item)</option>
                  {candidateParents.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-primaryText-light dark:text-primaryText-dark mb-1">
                  Relative Weight
                </label>
                <Input
                  data-testid="detail-weight"
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  disabled={isPending}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-border-light dark:border-border-dark">
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  size="sm"
                  data-testid="detail-save-btn"
                  disabled={isPending}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="detail-close-btn"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              </div>

              <div className="flex items-center gap-1.5">
                {status !== 'cancelled' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    data-testid="detail-cancel-btn"
                    onClick={handleCancelStatus}
                    disabled={isPending}
                    className="text-mutedText-light hover:text-amber-600 dark:text-mutedText-dark dark:hover:text-amber-400 gap-1 text-xs"
                    title="Cancel Item"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    <span>Cancel</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    data-testid="detail-reopen-btn"
                    onClick={handleReopenStatus}
                    disabled={isPending}
                    className="text-mutedText-light hover:text-green-600 dark:text-mutedText-dark dark:hover:text-green-400 gap-1 text-xs"
                    title="Reopen Item"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reopen</span>
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  data-testid="detail-delete-btn"
                  onClick={() => {
                    if (childCount > 0) {
                      setShowDeleteConfirm(true);
                    } else {
                      handleDelete();
                    }
                  }}
                  disabled={isPending}
                  className="text-mutedText-light hover:text-red-600 dark:text-mutedText-dark dark:hover:text-red-400 p-2"
                  title="Delete Item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Subtree Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent data-testid="delete-confirm-dialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete item and subtasks?</DialogTitle>
            <DialogDescription>
              &ldquo;{item.title}&rdquo; contains {childCount}{' '}
              {childCount === 1 ? 'subtask' : 'subtasks'}. Deleting it will permanently
              remove the entire subtree. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              data-testid="confirm-delete-btn"
              disabled={isPending}
              onClick={handleDelete}
            >
              Delete All
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

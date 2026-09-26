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
import {
  updateItemDetails,
  deleteItemSubtree,
  createChildItem,
} from '@/app/(planner)/actions';
import {
  resolveItemScheduling,
  getWeekBoundaries,
  getMonthBoundaries,
  getYearBoundaries,
} from '@/domain/calendar';
import { wouldCreateCycle, getDescendants } from '@/domain/hierarchy';
import { calculateSiblingContribution } from '@/domain/progress';
import { Trash2, AlertCircle, Ban, RotateCcw, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ItemRow, AreaRow, Horizon, ItemStatus, WeekDay } from '@/types/domain';

interface ItemDetailProps {
  item: ItemRow | null;
  allItems?: ItemRow[];
  areas?: AreaRow[];
  firstDayOfWeek?: WeekDay;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemUpdated?: () => void;
  onItemDeleted?: () => void;
}

export function ItemDetail({
  item,
  allItems = [],
  areas = [],
  firstDayOfWeek = 'monday',
  open,
  onOpenChange,
  onItemUpdated,
  onItemDeleted,
}: ItemDetailProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [horizon, setHorizon] = useState<Horizon>('inbox');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [time, setTime] = useState('');
  const [areaId, setAreaId] = useState<string>('');
  const [weight, setWeight] = useState('1');
  const [parentId, setParentId] = useState<string>('');
  const [status, setStatus] = useState<ItemStatus>('incomplete');

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showAddSubtask, setShowAddSubtask] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || '');
      setHorizon(item.horizon);
      setPeriodStart(item.period_start || '');
      setPeriodEnd(item.period_end || '');
      setTime(item.time || '');
      setAreaId(item.area_id || '');
      setWeight(String(item.weight || 1));
      setParentId(item.parent_id || '');
      setStatus(item.status);
      setError(null);
      setNewSubtaskTitle('');
      setShowAddSubtask(false);
    }
  }, [item]);

  if (!item) return null;

  // Calculate recursive descendant count for deletion prompt (T081)
  const descendants = getDescendants(allItems, item.id);
  const descendantCount = descendants.length;

  // Direct children for display in subtask list
  const directChildren = allItems.filter((i) => i.parent_id === item.id);

  // Sibling contribution percentage (T076)
  const effectiveWeight = parseFloat(weight) || 1;
  const siblingContribution = calculateSiblingContribution(item.id, allItems, effectiveWeight);

  const handleHorizonChange = (newHorizon: Horizon) => {
    setHorizon(newHorizon);
    const resolved = resolveItemScheduling({
      currentHorizon: item.horizon,
      currentPeriodStart: item.period_start,
      currentPeriodEnd: item.period_end,
      currentTime: item.time,
      targetHorizon: newHorizon,
      targetDate: periodStart || undefined,
      targetTime: time || undefined,
      firstDayOfWeek,
    });
    setPeriodStart(resolved.periodStart || '');
    setPeriodEnd(resolved.periodEnd || '');
    setTime(resolved.time || '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isPending) return;

    setError(null);
    startTransition(async () => {
      // Resolve scheduling to guarantee no corruption of calendar boundaries (T068)
      const scheduling = resolveItemScheduling({
        currentHorizon: item.horizon,
        currentPeriodStart: item.period_start,
        currentPeriodEnd: item.period_end,
        currentTime: item.time,
        targetHorizon: horizon,
        targetDate: periodStart || null,
        targetTime: time || null,
        firstDayOfWeek,
      });

      const res = await updateItemDetails(item.id, {
        title: title.trim(),
        description: description.trim() || null,
        horizon,
        periodStart: scheduling.periodStart,
        periodEnd: scheduling.periodEnd,
        time: scheduling.time,
        areaId: areaId || null,
        weight: effectiveWeight,
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

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || isPending) return;

    startTransition(async () => {
      const res = await createChildItem(item.id, newSubtaskTitle.trim());
      if (res?.error) {
        setError(res.error);
      } else {
        setNewSubtaskTitle('');
        setShowAddSubtask(false);
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

  // Candidate parents from full collection with cycle prevention (T079)
  const candidateParents = allItems.filter(
    (cp) => cp.id !== item.id && !wouldCreateCycle(allItems, item.id, cp.id)
  );

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

            {/* Horizon & Area */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-primaryText-light dark:text-primaryText-dark mb-1">
                  Horizon
                </label>
                <select
                  value={horizon}
                  onChange={(e) => handleHorizonChange(e.target.value as Horizon)}
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

            {/* Scheduling Details per Horizon (T068) */}
            {horizon === 'inbox' && (
              <p className="text-[11px] text-mutedText-light dark:text-mutedText-dark italic">
                Inbox items are unscheduled quick-capture thoughts.
              </p>
            )}

            {horizon === 'day' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-primaryText-light dark:text-primaryText-dark mb-1">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={periodStart}
                    onChange={(e) => {
                      setPeriodStart(e.target.value);
                      setPeriodEnd(e.target.value);
                    }}
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

            {horizon === 'week' && (
              <div>
                <label className="block text-xs font-medium text-primaryText-light dark:text-primaryText-dark mb-1">
                  Week Date
                </label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => {
                    const { start, end } = getWeekBoundaries(e.target.value, firstDayOfWeek);
                    setPeriodStart(start);
                    setPeriodEnd(end);
                  }}
                  disabled={isPending}
                  className="text-xs"
                />
                <p className="text-[11px] text-mutedText-light dark:text-mutedText-dark mt-1">
                  Calendar week: <span className="font-medium text-primaryText-light dark:text-primaryText-dark">{periodStart} &ndash; {periodEnd}</span>
                </p>
              </div>
            )}

            {horizon === 'month' && (
              <div>
                <label className="block text-xs font-medium text-primaryText-light dark:text-primaryText-dark mb-1">
                  Month
                </label>
                <Input
                  type="month"
                  value={periodStart ? periodStart.slice(0, 7) : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [y, m] = e.target.value.split('-').map(Number);
                      const { start, end } = getMonthBoundaries(y, m);
                      setPeriodStart(start);
                      setPeriodEnd(end);
                    }
                  }}
                  disabled={isPending}
                  className="text-xs"
                />
                <p className="text-[11px] text-mutedText-light dark:text-mutedText-dark mt-1">
                  Calendar month: <span className="font-medium text-primaryText-light dark:text-primaryText-dark">{periodStart} &ndash; {periodEnd}</span>
                </p>
              </div>
            )}

            {horizon === 'year' && (
              <div>
                <label className="block text-xs font-medium text-primaryText-light dark:text-primaryText-dark mb-1">
                  Year
                </label>
                <Input
                  type="number"
                  min="2000"
                  max="2100"
                  value={periodStart ? periodStart.slice(0, 4) : ''}
                  onChange={(e) => {
                    const y = parseInt(e.target.value, 10);
                    if (y) {
                      const { start, end } = getYearBoundaries(y);
                      setPeriodStart(start);
                      setPeriodEnd(end);
                    }
                  }}
                  disabled={isPending}
                  className="text-xs"
                />
                <p className="text-[11px] text-mutedText-light dark:text-mutedText-dark mt-1">
                  Calendar year: <span className="font-medium text-primaryText-light dark:text-primaryText-dark">{periodStart} &ndash; {periodEnd}</span>
                </p>
              </div>
            )}

            {/* Parent & Progress Weight (T076, T079) */}
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
                  Progress weight
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

            {/* Weight helper text & sibling contribution percentage (T076) */}
            <div className="text-[11px] text-mutedText-light dark:text-mutedText-dark -mt-2">
              {parentId ? (
                <span>
                  Relative share of parent progress compared to siblings
                  {siblingContribution !== null && (
                    <span className="font-medium text-primaryText-light dark:text-primaryText-dark ml-1">
                      (~{siblingContribution}% of parent)
                    </span>
                  )}
                </span>
              ) : (
                <span className="italic opacity-80">
                  Root item &ndash; has no parent progress contribution.
                </span>
              )}
            </div>

            {/* Subtasks Section with Discoverable Action (T072) */}
            <div className="pt-3 border-t border-border-light dark:border-border-dark space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-primaryText-light dark:text-primaryText-dark">
                  Subtasks ({directChildren.length})
                </span>
                {!showAddSubtask && (
                  <button
                    type="button"
                    data-testid="detail-add-subtask-btn"
                    onClick={() => setShowAddSubtask(true)}
                    className="flex items-center gap-1 text-[11px] text-accent hover:underline cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add subtask</span>
                  </button>
                )}
              </div>

              {directChildren.length > 0 && (
                <div className="space-y-1 max-h-36 overflow-y-auto rounded border border-border-light/40 dark:border-border-dark/40 p-2 bg-surface-light dark:bg-surface-dark">
                  {directChildren.map((child) => (
                    <div
                      key={child.id}
                      className="text-xs flex items-center justify-between text-primaryText-light dark:text-primaryText-dark py-0.5"
                    >
                      <span className={cn('truncate', child.status === 'complete' && 'line-through text-mutedText-light dark:text-mutedText-dark')}>
                        &bull; {child.title}
                      </span>
                      <span className="text-[10px] text-mutedText-light dark:text-mutedText-dark">
                        {child.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {showAddSubtask && (
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    type="text"
                    data-testid="detail-subtask-input"
                    placeholder="New subtask title... (press Enter)"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask(e);
                      } else if (e.key === 'Escape') {
                        setShowAddSubtask(false);
                        setNewSubtaskTitle('');
                      }
                    }}
                    className="h-8 text-xs flex-1"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    data-testid="detail-save-subtask-btn"
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskTitle.trim() || isPending}
                    className="h-8 text-xs"
                  >
                    Add
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSubtask(false);
                      setNewSubtaskTitle('');
                    }}
                    className="text-xs text-mutedText-light hover:text-primaryText-light dark:text-mutedText-dark dark:hover:text-primaryText-dark"
                  >
                    Cancel
                  </button>
                </div>
              )}
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
                    if (descendantCount > 0) {
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

      {/* Subtree Delete Confirmation Dialog with Recursive Count (T081) */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent data-testid="delete-confirm-dialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete item and subtasks?</DialogTitle>
            <DialogDescription>
              &ldquo;{item.title}&rdquo; contains {descendantCount}{' '}
              {descendantCount === 1 ? 'subtask' : 'subtasks'}. Deleting it will permanently
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

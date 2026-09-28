'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { createArea, updateArea, deleteArea } from '@/app/(planner)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { AREA_PALETTE, AREA_ICONS, getAreaColor } from '@/domain/areas';
import { AreaIcon } from './area-icon';
import { cn } from '@/lib/utils';
import type { AreaRow } from '@/types/domain';

interface SettingsAreaManagerProps {
  initialAreas: AreaRow[];
}

export function SettingsAreaManager({ initialAreas }: SettingsAreaManagerProps) {
  const [areas, setAreas] = useState<AreaRow[]>(initialAreas);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaColor, setNewAreaColor] = useState<string>('steel-blue');
  const [newAreaIcon, setNewAreaIcon] = useState<string>('folder');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState<string>('steel-blue');
  const [editingIcon, setEditingIcon] = useState<string>('folder');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  React.useEffect(() => {
    setAreas(initialAreas);
  }, [initialAreas]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim() || isPending) return;

    setError(null);
    startTransition(async () => {
      const res = await createArea(newAreaName.trim(), newAreaIcon, newAreaColor);
      if (res?.error) {
        setError(res.error);
      } else {
        if (res?.area) {
          setAreas((prev) => [...prev, res.area]);
        }
        setNewAreaName('');
        setNewAreaIcon('folder');
      }
    });
  };

  const handleStartEdit = (area: AreaRow) => {
    setEditingId(area.id);
    setEditingName(area.name);
    setEditingColor(area.color_token || 'steel-blue');
    setEditingIcon(area.icon || 'folder');
  };

  const handleSaveEdit = (areaId: string) => {
    if (!editingName.trim() || isPending) return;

    setError(null);
    startTransition(async () => {
      const res = await updateArea(areaId, editingName.trim(), editingIcon, editingColor);
      if (res?.error) {
        setError(res.error);
      } else {
        setAreas((prev) =>
          prev.map((a) =>
            a.id === areaId
              ? { ...a, name: editingName.trim(), icon: editingIcon, color_token: editingColor }
              : a
          )
        );
        setEditingId(null);
      }
    });
  };

  const handleDelete = (areaId: string) => {
    if (isPending) return;

    setError(null);
    setAreas((prev) => prev.filter((a) => a.id !== areaId));
    startTransition(async () => {
      const res = await deleteArea(areaId);
      if (res?.error) {
        setError(res.error);
        setAreas(initialAreas);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Create Area Form with Color Palette (T075) */}
      <form onSubmit={handleCreate} className="space-y-2">
        <div className="flex gap-2">
          <Input
            type="text"
            data-testid="new-area-name-input"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
            placeholder="New Area name (e.g. Study, Fitness, Personal)..."
            disabled={isPending}
            className="flex-1 text-xs"
          />
          <Button
            type="submit"
            size="sm"
            data-testid="add-area-btn"
            disabled={!newAreaName.trim() || isPending}
            className="gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Area</span>
          </Button>
        </div>

        {/* Color Palette Picker for New Area */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="text-[11px] text-mutedText-light dark:text-mutedText-dark mr-1">Color:</span>
          {AREA_PALETTE.map((color) => {
            const isSelected = newAreaColor === color.id;
            return (
              <button
                key={color.id}
                type="button"
                data-testid={`color-picker-${color.id}`}
                onClick={() => setNewAreaColor(color.id)}
                title={color.name}
                aria-label={color.name}
                className={cn(
                  'h-4 w-4 rounded-full transition-transform cursor-pointer',
                  isSelected ? 'ring-2 ring-offset-1 ring-accent scale-110' : 'opacity-80 hover:opacity-100'
                )}
                style={{ backgroundColor: color.hex }}
              />
            );
          })}
        </div>

        {/* Icon Picker for New Area */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="text-[11px] text-mutedText-light dark:text-mutedText-dark mr-1">Icon:</span>
          {AREA_ICONS.map((iconChoice) => {
            const isSelected = newAreaIcon === iconChoice.id;
            return (
              <button
                key={iconChoice.id}
                type="button"
                data-testid={`icon-picker-${iconChoice.id}`}
                onClick={() => setNewAreaIcon(iconChoice.id)}
                title={iconChoice.name}
                aria-label={iconChoice.name}
                className={cn(
                  'p-1 rounded text-mutedText-light dark:text-mutedText-dark hover:text-primaryText-light dark:hover:text-primaryText-dark transition-colors cursor-pointer',
                  isSelected && 'bg-accent/15 text-accent dark:text-accent ring-1 ring-accent'
                )}
              >
                <AreaIcon icon={iconChoice.id} className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
      </form>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Areas List */}
      <div className="divide-y divide-border-light/40 dark:divide-border-dark/40 border border-border-light dark:border-border-dark rounded">
        {areas.length === 0 ? (
          <p className="p-3 text-xs text-mutedText-light/70 dark:text-mutedText-dark/70 italic text-center">
            No areas configured yet. Create one above to organize your planner.
          </p>
        ) : (
          areas.map((area) => {
            const isEditing = editingId === area.id;
            const areaColorHex = getAreaColor(area.color_token);

            return (
              <div
                key={area.id}
                data-testid="area-row"
                className="flex items-center justify-between p-2.5 hover:bg-[#FAF9F5] dark:hover:bg-[#252525] transition-colors"
              >
                {isEditing ? (
                  <div className="flex flex-col gap-2 flex-1 mr-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        disabled={isPending}
                        className="h-7 text-xs flex-1"
                      />
                      <button
                        type="button"
                        data-testid="save-area-btn"
                        onClick={() => handleSaveEdit(area.id)}
                        disabled={isPending || !editingName.trim()}
                        className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50 cursor-pointer"
                        title="Save"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        data-testid="cancel-area-edit-btn"
                        onClick={() => setEditingId(null)}
                        className="p-1 text-mutedText-light hover:text-primaryText-light dark:text-mutedText-dark dark:hover:text-primaryText-dark cursor-pointer"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Color palette selector in edit mode */}
                    <div className="flex items-center gap-1.5 pl-1">
                      <span className="text-[10px] text-mutedText-light dark:text-mutedText-dark">Color:</span>
                      {AREA_PALETTE.map((color) => {
                        const isSelected = editingColor === color.id;
                        return (
                          <button
                            key={color.id}
                            type="button"
                            data-testid={`edit-color-picker-${color.id}`}
                            onClick={() => setEditingColor(color.id)}
                            title={color.name}
                            aria-label={color.name}
                            className={cn(
                              'h-3.5 w-3.5 rounded-full transition-transform cursor-pointer',
                              isSelected ? 'ring-2 ring-offset-1 ring-accent scale-110' : 'opacity-70 hover:opacity-100'
                            )}
                            style={{ backgroundColor: color.hex }}
                          />
                        );
                      })}
                    </div>

                    {/* Icon selector in edit mode */}
                    <div className="flex items-center gap-1.5 pl-1">
                      <span className="text-[10px] text-mutedText-light dark:text-mutedText-dark">Icon:</span>
                      {AREA_ICONS.map((iconChoice) => {
                        const isSelected = editingIcon === iconChoice.id;
                        return (
                          <button
                            key={iconChoice.id}
                            type="button"
                            data-testid={`edit-icon-picker-${iconChoice.id}`}
                            onClick={() => setEditingIcon(iconChoice.id)}
                            title={iconChoice.name}
                            aria-label={iconChoice.name}
                            className={cn(
                              'p-0.5 rounded text-mutedText-light dark:text-mutedText-dark hover:text-primaryText-light dark:hover:text-primaryText-dark transition-colors cursor-pointer',
                              isSelected && 'bg-accent/15 text-accent dark:text-accent ring-1 ring-accent'
                            )}
                          >
                            <AreaIcon icon={iconChoice.id} className="h-3 w-3" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: areaColorHex }}
                    />
                    <span style={{ color: areaColorHex }}>
                      <AreaIcon icon={area.icon} className="h-3.5 w-3.5 shrink-0" />
                    </span>
                    <span className="text-xs font-medium text-primaryText-light dark:text-primaryText-dark">
                      {area.name}
                    </span>
                  </div>
                )}

                {!isEditing && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      data-testid="edit-area-btn"
                      onClick={() => handleStartEdit(area)}
                      disabled={isPending}
                      className="p-1 text-mutedText-light hover:text-accent dark:text-mutedText-dark dark:hover:text-accent transition-colors rounded cursor-pointer"
                      title="Edit Area"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      data-testid="delete-area-btn"
                      onClick={() => handleDelete(area.id)}
                      disabled={isPending}
                      className="p-1 text-mutedText-light hover:text-red-600 dark:text-mutedText-dark dark:hover:text-red-400 transition-colors rounded cursor-pointer"
                      title="Delete Area"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

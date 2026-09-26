'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { updatePreferences } from '@/app/(planner)/actions';
import { Button } from '@/components/ui/button';
import type { WeekDay } from '@/types/domain';

interface SettingsPreferencesFormProps {
  currentFirstDay: WeekDay;
}

const WEEKDAYS: { label: string; value: WeekDay }[] = [
  { label: 'Monday (Default)', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
  { label: 'Sunday', value: 'sunday' },
];

export function SettingsPreferencesForm({ currentFirstDay }: SettingsPreferencesFormProps) {
  const [selectedDay, setSelectedDay] = useState<WeekDay>(currentFirstDay);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);

    startTransition(async () => {
      await updatePreferences(selectedDay);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label
          htmlFor="first-day-select"
          className="block text-xs font-medium text-primaryText-light dark:text-primaryText-dark mb-1"
        >
          First day of the week
        </label>
        <p className="text-[11px] text-mutedText-light dark:text-mutedText-dark mb-2">
          Determines how calendar weeks are calculated and displayed in the Week view.
        </p>

        <select
          id="first-day-select"
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value as WeekDay)}
          disabled={isPending}
          className="w-full sm:w-64 rounded border border-border-light bg-surface-light px-3 py-1.5 text-xs text-primaryText-light dark:border-border-dark dark:bg-surface-dark dark:text-primaryText-dark focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {WEEKDAYS.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" size="sm" disabled={isPending || selectedDay === currentFirstDay}>
          {isPending ? 'Saving...' : 'Save Preference'}
        </Button>
        {saved && (
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
            Preference saved successfully.
          </span>
        )}
      </div>
    </form>
  );
}

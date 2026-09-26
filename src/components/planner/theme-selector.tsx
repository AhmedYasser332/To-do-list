'use client';

import * as React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type Theme } from '@/components/theme/theme-provider';
import { cn } from '@/lib/utils';

export function ThemeSelector() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const options: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-primaryText-light dark:text-primaryText-dark mb-1">
          Interface Theme
        </label>
        <p className="text-[11px] text-mutedText-light dark:text-mutedText-dark mb-3">
          Select your preferred interface appearance. In System mode, the app automatically reflects your operating system settings.
        </p>

        <div
          role="radiogroup"
          aria-label="Theme selection"
          className="inline-flex items-center gap-1 rounded border border-border-light bg-[#F5F5F0] p-1 dark:border-border-dark dark:bg-[#1C1C1C]"
        >
          {options.map(({ value, label, icon: Icon }) => {
            const isActive = theme === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isActive}
                data-testid={`theme-${value}-btn`}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-all select-none cursor-pointer',
                  isActive
                    ? 'bg-surface-light text-primaryText-light shadow-xs border border-border-light/70 dark:bg-[#2A2A2A] dark:text-primaryText-dark dark:border-border-dark'
                    : 'text-mutedText-light hover:text-primaryText-light dark:text-mutedText-dark dark:hover:text-primaryText-dark border border-transparent'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {theme === 'system' && (
        <p className="text-[11px] text-mutedText-light/80 dark:text-mutedText-dark/80">
          Active system theme:{' '}
          <span className="font-medium text-primaryText-light dark:text-primaryText-dark capitalize">
            {resolvedTheme}
          </span>
        </p>
      )}
    </div>
  );
}

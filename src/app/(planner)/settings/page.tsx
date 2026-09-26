import * as React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsAreaManager } from '@/components/planner/settings-area-manager';
import { SettingsPreferencesForm } from '@/components/planner/settings-preferences-form';
import { Settings as SettingsIcon } from 'lucide-react';
import type { AreaRow, WeekDay } from '@/types/domain';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();

  if (authError || !claimsData?.claims?.sub) {
    redirect('/login');
  }

  const userId = claimsData.claims.sub as string;

  const { data: prefsData } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const { data: areasData } = await supabase
    .from('areas')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  const currentFirstDay: WeekDay = prefsData?.first_day_of_week || 'monday';
  const areas: AreaRow[] = areasData || [];

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div className="border-b border-border-light pb-4 dark:border-border-dark">
        <h1 className="text-xl font-semibold tracking-tight text-primaryText-light dark:text-primaryText-dark flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-accent" />
          <span>Settings</span>
        </h1>
        <p className="text-xs text-mutedText-light dark:text-mutedText-dark mt-1">
          Manage your personal planning preferences and Areas
        </p>
      </div>

      {/* Section 1: Planning Preferences */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-mutedText-light dark:text-mutedText-dark">
          Planning Preferences
        </h2>
        <div className="rounded border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark shadow-sm">
          <SettingsPreferencesForm currentFirstDay={currentFirstDay} />
        </div>
      </section>

      {/* Section 2: Areas Management */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-mutedText-light dark:text-mutedText-dark">
          Areas of Focus
        </h2>
        <div className="rounded border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark shadow-sm">
          <SettingsAreaManager initialAreas={areas} />
        </div>
      </section>
    </div>
  );
}

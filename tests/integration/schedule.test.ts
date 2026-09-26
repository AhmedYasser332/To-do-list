import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { resolveItemScheduling } from '@/domain/calendar';
import { determineChildScheduling } from '@/domain/hierarchy';

describe('Scheduling Invariants & Child Inheritance Integration Tests', () => {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

  let ownerClient: SupabaseClient<Database>;
  let userId: string;

  beforeAll(async () => {
    ownerClient = createClient<Database>(supabaseUrl, publishableKey, {
      auth: { persistSession: false },
    });

    const { data: authData, error: signInError } = await ownerClient.auth.signInWithPassword({
      email: 'owner@example.com',
      password: 'password123',
    });

    expect(signInError).toBeNull();
    userId = authData.user!.id;
  }, 15000);

  it('preserves existing Week, Month, and Year boundaries when updating non-scheduling fields', async () => {
    // 1. Create Week Item
    const { data: weekItem, error: weekErr } = await ownerClient
      .from('items')
      .insert({
        user_id: userId,
        title: 'Original Week Item',
        horizon: 'week',
        period_start: '2026-09-21',
        period_end: '2026-09-27',
      })
      .select()
      .single();

    expect(weekErr).toBeNull();
    expect(weekItem!.period_end).toBe('2026-09-27');

    // Simulate ItemDetail save with unchanged scheduling
    const weekScheduling = resolveItemScheduling({
      currentHorizon: weekItem!.horizon,
      currentPeriodStart: weekItem!.period_start,
      currentPeriodEnd: weekItem!.period_end,
      targetHorizon: 'week',
    });

    const { data: updatedWeek, error: updateWeekErr } = await ownerClient
      .from('items')
      .update({
        title: 'Updated Week Title',
        description: 'New Description',
        period_start: weekScheduling.periodStart,
        period_end: weekScheduling.periodEnd,
      })
      .eq('id', weekItem!.id)
      .select()
      .single();

    expect(updateWeekErr).toBeNull();
    expect(updatedWeek!.title).toBe('Updated Week Title');
    expect(updatedWeek!.period_start).toBe('2026-09-21');
    expect(updatedWeek!.period_end).toBe('2026-09-27'); // NOT corrupted to 2026-09-21!

    // Cleanup
    await ownerClient.from('items').delete().eq('id', weekItem!.id);
  });

  it('child scheduling domain rules inherit Day dates but create unscheduled Inbox items for non-Day parents', () => {
    // Day parent
    const dayContext = determineChildScheduling({
      horizon: 'day',
      period_start: '2026-09-26',
      period_end: '2026-09-26',
      area_id: 'some-area',
    });
    expect(dayContext.horizon).toBe('day');
    expect(dayContext.period_start).toBe('2026-09-26');
    expect(dayContext.area_id).toBe('some-area');

    // Week parent
    const weekContext = determineChildScheduling({
      horizon: 'week',
      period_start: '2026-09-21',
      period_end: '2026-09-27',
      area_id: 'some-area',
    });
    expect(weekContext.horizon).toBe('inbox');
    expect(weekContext.period_start).toBeNull();
    expect(weekContext.period_end).toBeNull();
    expect(weekContext.area_id).toBe('some-area');

    // Month parent
    const monthContext = determineChildScheduling({
      horizon: 'month',
      period_start: '2026-09-01',
      period_end: '2026-09-30',
      area_id: null,
    });
    expect(monthContext.horizon).toBe('inbox');
    expect(monthContext.period_start).toBeNull();

    // Year parent
    const yearContext = determineChildScheduling({
      horizon: 'year',
      period_start: '2026-01-01',
      period_end: '2026-12-31',
      area_id: null,
    });
    expect(yearContext.horizon).toBe('inbox');
    expect(yearContext.period_start).toBeNull();
  });
});

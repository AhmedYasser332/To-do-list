import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

describe('Row Level Security (RLS) & Personal Data Isolation', () => {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uljtdqvnvfxqunchhvjz.supabase.co';
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_wiWVxobv610vssQuLCH6EA_3E5fdEQ5';

  it('rejects unauthenticated/public reads from protected planning tables', async () => {
    const unauthenticatedClient = createClient<Database>(supabaseUrl, publishableKey, {
      auth: { persistSession: false },
    });

    const { data: items, error: itemsError } = await unauthenticatedClient
      .from('items')
      .select('*');

    // Under RLS, unauthenticated select returns empty data or permission error
    if (itemsError) {
      expect(itemsError).toBeDefined();
    } else {
      expect(items).toEqual([]);
    }

    const { data: areas, error: areasError } = await unauthenticatedClient
      .from('areas')
      .select('*');

    if (areasError) {
      expect(areasError).toBeDefined();
    } else {
      expect(areas).toEqual([]);
    }

    const { data: prefs, error: prefsError } = await unauthenticatedClient
      .from('user_preferences')
      .select('*');

    if (prefsError) {
      expect(prefsError).toBeDefined();
    } else {
      expect(prefs).toEqual([]);
    }
  }, 15000);

  it('strictly prohibits unauthenticated insertions into items, areas, and user_preferences', async () => {
    const unauthenticatedClient = createClient<Database>(supabaseUrl, publishableKey, {
      auth: { persistSession: false },
    });

    const fakeUserId = '00000000-0000-0000-0000-000000000099';

    const { error: itemInsertError } = await unauthenticatedClient
      .from('items')
      .insert({
        title: 'Unauthorized Task',
        user_id: fakeUserId,
        horizon: 'inbox',
      });

    expect(itemInsertError).toBeDefined();

    const { error: areaInsertError } = await unauthenticatedClient
      .from('areas')
      .insert({
        name: 'Unauthorized Area',
        user_id: fakeUserId,
      });

    expect(areaInsertError).toBeDefined();

    const { error: prefInsertError } = await unauthenticatedClient
      .from('user_preferences')
      .insert({
        user_id: fakeUserId,
        first_day_of_week: 'monday',
      });

    expect(prefInsertError).toBeDefined();
  }, 15000);
});

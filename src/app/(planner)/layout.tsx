import * as React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DesktopSidebar } from '@/components/shell/desktop-sidebar';
import { MobileNav } from '@/components/shell/mobile-nav';
import type { AreaRow } from '@/types/domain';

export const dynamic = 'force-dynamic';

export default async function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: claimsData, error } = await supabase.auth.getClaims();

  if (error || !claimsData?.claims) {
    redirect('/login');
  }

  const { data: areasData } = await supabase
    .from('areas')
    .select('*')
    .order('sort_order', { ascending: true });

  const areas: AreaRow[] = areasData || [];

  return (
    <div className="flex min-h-screen bg-canvas-light text-primaryText-light dark:bg-canvas-dark dark:text-primaryText-dark">
      <DesktopSidebar areas={areas} />
      <main className="flex-1 pb-16 md:pb-0 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-8">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}

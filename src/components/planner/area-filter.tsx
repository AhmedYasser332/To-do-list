'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { X, Filter } from 'lucide-react';
import { getAreaColor } from '@/domain/areas';
import type { AreaRow } from '@/types/domain';

interface AreaFilterProps {
  areas: AreaRow[];
  activeAreaId?: string;
}

export function AreaFilter({ areas, activeAreaId }: AreaFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeArea = areas.find((a) => a.id === activeAreaId);

  const setArea = (areaId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (areaId) {
      params.set('area', areaId);
    } else {
      params.delete('area');
    }
    const query = params.toString();
    const targetUrl = query ? `${pathname}?${query}` : pathname;
    router.push(targetUrl);
    router.refresh();
  };

  if (!activeAreaId) {
    if (areas.length === 0) return null;

    return (
      <div className="flex items-center gap-1.5 text-xs text-mutedText-light dark:text-mutedText-dark">
        <Filter className="h-3.5 w-3.5" />
        <select
          data-testid="area-filter-select"
          value=""
          onChange={(e) => setArea(e.target.value || null)}
          className="bg-surface-light text-xs rounded border border-border-light px-2 py-1 dark:bg-surface-dark dark:border-border-dark text-primaryText-light dark:text-primaryText-dark focus:outline-none"
        >
          <option value="">Filter by Area...</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-accent-subtle px-2.5 py-0.5 text-xs text-accent">
      <span
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: getAreaColor(activeArea?.color_token) }}
      />
      <span className="font-medium">Area: {activeArea?.name || 'Selected'}</span>
      <Link
        href={pathname}
        data-testid="clear-area-filter"
        className="rounded-full p-0.5 hover:bg-accent/20 transition-colors"
        title="Clear Area filter"
      >
        <X className="h-3 w-3" />
      </Link>
    </div>
  );
}

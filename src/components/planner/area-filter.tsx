'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { X, Filter } from 'lucide-react';
import { getAreaColor } from '@/domain/areas';
import { AreaIcon } from './area-icon';
import type { AreaRow } from '@/types/domain';

interface AreaFilterProps {
  areas: AreaRow[];
  activeAreaId?: string;
}

export function AreaFilter({ areas, activeAreaId }: AreaFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedAreaId, setSelectedAreaId] = React.useState<string | null>(
    searchParams.get('area') ?? activeAreaId ?? null
  );

  React.useEffect(() => {
    setSelectedAreaId(searchParams.get('area') ?? activeAreaId ?? null);
  }, [searchParams, activeAreaId]);

  const activeArea = areas.find((a) => a.id === selectedAreaId);

  const lastClearRef = React.useRef(0);

  const setArea = (areaId: string | null) => {
    setSelectedAreaId(areaId);
    const currentSearch = typeof window !== 'undefined' ? window.location.search : searchParams.toString();
    const params = new URLSearchParams(currentSearch);
    if (areaId) {
      params.set('area', areaId);
    } else {
      params.delete('area');
    }
    const query = params.toString();
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : pathname;
    const targetUrl = query ? `${currentPath}?${query}` : currentPath;
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', targetUrl);
    }
    router.push(targetUrl);
  };

  const handleClear = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastClearRef.current < 300) return;
    lastClearRef.current = now;
    setArea(null);
  };

  if (!selectedAreaId) {
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
      <span style={{ color: getAreaColor(activeArea?.color_token) }}>
        <AreaIcon icon={activeArea?.icon} className="h-3 w-3 shrink-0" />
      </span>
      <span className="font-medium truncate max-w-[110px] sm:max-w-[200px]">
        Area: {activeArea?.name || 'Selected'}
      </span>
      <button
        type="button"
        data-testid="clear-area-filter"
        onClick={handleClear}
        onTouchEnd={handleClear}
        className="rounded-full p-1 min-w-[24px] min-h-[24px] inline-flex items-center justify-center hover:bg-accent/20 transition-colors cursor-pointer"
        title="Clear Area filter"
      >
        <X className="h-3.5 w-3.5 pointer-events-none" />
      </button>
    </div>
  );
}

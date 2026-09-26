# Data Model: Core Planner (Slice 1)

**Feature**: `specs/001-core-planner/spec.md`  
**Date**: 2026-09-26  
**Status**: Revised (Post-Review)  

---

## 1. Entities & Attributes

### 1.1 `Item`
The central and only planning entity in the domain. Represents all planning nodes (goals, tasks, subtasks, inbox captures).

| Attribute | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | Primary Key |
| `user_id` | `uuid` | No | — | Foreign key to `auth.users(id)` |
| `parent_id` | `uuid` | Yes | `null` | Foreign key to `items(id)` (hierarchy parent) |
| `title` | `text` | No | — | Title of the item (minimum 1 character) |
| `description` | `text` | Yes | `null` | Optional markdown or text notes |
| `horizon` | `text` | No | `'inbox'` | Planning horizon: `'inbox'`, `'day'`, `'week'`, `'month'`, `'year'` |
| `period_start` | `date` | Yes | `null` | Start date of the scheduled period (`null` for inbox) |
| `period_end` | `date` | Yes | `null` | End date of the scheduled period (`null` for inbox) |
| `time` | `text` | Yes | `null` | Floating wall-clock time string (`HH:mm`, e.g., `'09:30'`) |
| `area_id` | `uuid` | Yes | `null` | Foreign key to `areas(id)` |
| `weight` | `double precision` | No | `1.0` | Relative positive weight for progress calculation |
| `status` | `text` | No | `'incomplete'` | Completion status: `'incomplete'`, `'complete'`, `'cancelled'` |
| `is_manually_completed` | `boolean` | No | `false` | True if marked complete directly despite incomplete children |
| `sort_order` | `integer` | No | `0` | Sequential integer ordering position among siblings |
| `completed_at` | `timestamptz` | Yes | `null` | Timestamp when the item was marked completed |
| `created_at` | `timestamptz` | No | `now()` | Record creation timestamp |
| `updated_at` | `timestamptz` | No | `now()` | Last modification timestamp |

#### Invariants & Schedule Integrity Constraints:
- `weight > 0` (weights must be positive numbers).
- `status IN ('incomplete', 'complete', 'cancelled')`.
- `horizon IN ('inbox', 'day', 'week', 'month', 'year')`.
- `parent_id != id` (an item cannot be its own direct parent).
- **Inbox**: `period_start IS NULL AND period_end IS NULL AND time IS NULL`.
- **Day**: `period_start IS NOT NULL AND period_end = period_start` (`time` may be null or valid `HH:mm`).
- **Week / Month / Year**: `period_start IS NOT NULL AND period_end IS NOT NULL AND period_end >= period_start AND time IS NULL`.
- **Manual Completion Integrity**: `is_manually_completed = false OR status = 'complete'` (an incomplete or cancelled item can never be marked as manually completed).

---

### 1.2 `Area`
Simple life categorization (e.g., Study, Projects, Personal, Fitness).

| Attribute | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | `gen_random_uuid()` | Primary Key |
| `user_id` | `uuid` | No | — | Foreign key to `auth.users(id)` |
| `name` | `text` | No | — | Name of the area (minimum 1 character) |
| `icon` | `text` | No | `'folder'` | Icon identifier |
| `color_token` | `text` | Yes | `null` | Semantic restrained color token (e.g., `'blue'`) |
| `sort_order` | `integer` | No | `0` | Sequential integer ordering position among areas |
| `created_at` | `timestamptz` | No | `now()` | Record creation timestamp |
| `updated_at` | `timestamptz` | No | `now()` | Last modification timestamp |

---

### 1.3 `UserPreferences`
Single-row preferences record per user.

| Attribute | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `user_id` | `uuid` | No | — | Primary Key, foreign key to `auth.users(id)` |
| `first_day_of_week` | `text` | No | `'monday'` | Any of: `'monday'`, `'tuesday'`, `'wednesday'`, `'thursday'`, `'friday'`, `'saturday'`, `'sunday'` |
| `created_at` | `timestamptz` | No | `now()` | Record creation timestamp |
| `updated_at` | `timestamptz` | No | `now()` | Last modification timestamp |

#### Initialization & Fallback Semantics
- No database seed row or Auth trigger is required.
- If an authenticated owner has no preferences row in `user_preferences`, the application layer automatically adopts the effective default (`first_day_of_week = 'monday'`).
- The Settings UI displays this effective default.
- Updating or saving the preference executes an `UPSERT` on `user_preferences(user_id)`.

---

## 2. PostgreSQL DDL (Slice 1 Migration)

```sql
-- 1. Create Areas table
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  icon text not null default 'folder',
  color_token text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Create Items table
create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.items(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  horizon text not null default 'inbox' check (horizon in ('inbox', 'day', 'week', 'month', 'year')),
  period_start date,
  period_end date,
  time text check (time is null or time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  area_id uuid references public.areas(id) on delete set null,
  weight double precision not null default 1.0 check (weight > 0),
  status text not null default 'incomplete' check (status in ('incomplete', 'complete', 'cancelled')),
  is_manually_completed boolean not null default false,
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Structural constraints
  constraint item_not_self_parent check (parent_id is null or parent_id <> id),
  
  -- Scheduling integrity
  constraint item_schedule_integrity check (
    (horizon = 'inbox' and period_start is null and period_end is null and time is null) or
    (horizon = 'day' and period_start is not null and period_end = period_start) or
    (horizon in ('week', 'month', 'year') and period_start is not null and period_end is not null and period_end >= period_start and time is null)
  ),
  
  -- Completion integrity
  constraint item_manual_completion_integrity check (
    not is_manually_completed or status = 'complete'
  )
);

-- 3. Create User Preferences table
create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_day_of_week text not null default 'monday' check (
    first_day_of_week in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Indexes for single-owner query optimization
create index idx_items_user_parent on public.items(user_id, parent_id);
create index idx_items_user_horizon_period on public.items(user_id, horizon, period_start);
create index idx_items_user_area on public.items(user_id, area_id);
create index idx_areas_user_sort on public.areas(user_id, sort_order);

-- 5. Enable Row Level Security (RLS) on all tables
alter table public.areas enable row level security;
alter table public.items enable row level security;
alter table public.user_preferences enable row level security;

-- 6. RLS Policies (Owner isolation)
create policy "areas_user_isolation" on public.areas
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "items_user_isolation" on public.items
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "preferences_user_isolation" on public.user_preferences
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

---

## 3. TypeScript Domain Types (`src/types/domain.ts`)

Instead of duplicating database column definitions manually, the application imports authoritative persistence types generated directly from the Supabase schema via `supabase gen types typescript` or Supabase MCP:

```typescript
import type { Database } from './database.types';

// Authoritative database table rows
export type ItemRow = Database['public']['Tables']['items']['Row'];
export type ItemInsert = Database['public']['Tables']['items']['Insert'];
export type ItemUpdate = Database['public']['Tables']['items']['Update'];

export type AreaRow = Database['public']['Tables']['areas']['Row'];
export type AreaInsert = Database['public']['Tables']['areas']['Insert'];
export type AreaUpdate = Database['public']['Tables']['areas']['Update'];

export type UserPreferencesRow = Database['public']['Tables']['user_preferences']['Row'];
export type UserPreferencesUpdate = Database['public']['Tables']['user_preferences']['Update'];

// Narrow domain unions matching database check constraints
export type Horizon = 'inbox' | 'day' | 'week' | 'month' | 'year';
export type ItemStatus = 'incomplete' | 'complete' | 'cancelled';
export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

/**
 * In-memory presentation node enriched with tree hierarchy and recursively calculated progress
 */
export interface ItemNode extends ItemRow {
  progress: number; // 0 to 100
  children: ItemNode[];
}
```

---

## 4. State Transitions & Sibling Reordering

### Completion & Manual Resolution
```text
[ incomplete ] ─── (toggle check) ──────────> [ complete ]
      │                                             │
      │                                             └── (toggle uncheck) ──> [ incomplete ]
      │                                                                           │
      └── (mark cancelled in detail drawer) ──> [ cancelled ]                     │
                                                     │                            │
                                                     └── (reopen) ────────────────┘
```
- Marking parent complete with incomplete children presents:
  1. **Complete parent only**: `status = 'complete'`, `is_manually_completed = true`. Descendants retain their states.
  2. **Complete parent and all descendants**: `status = 'complete'`, `is_manually_completed = false`, all descendants set to `complete`.
  3. **Cancel**: No change.
- Reopening parent: `status = 'incomplete'`, `is_manually_completed = false`.

### Sibling Reordering
Siblings under the same parent (or root siblings in a list) use integer `sort_order` values (`0, 1, 2, ...`). When an item is moved from index $A$ to index $B$:
1. Sibling array is reordered in memory.
2. New sequential integer indices are assigned.
3. Affected siblings' `sort_order` values are persisted via Server Action. No LexoRank, fractional positions, or rebalancing algorithms.

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

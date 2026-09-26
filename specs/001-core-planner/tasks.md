# Tasks: Core Planner (Slice 1)

**Input**: Design documents from `/specs/001-core-planner/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`)  
**Prerequisites**: `specs/001-core-planner/plan.md`, `specs/001-core-planner/spec.md`, `specs/001-core-planner/data-model.md`  
**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story increment.

## Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (e.g. `[US1]`, `[US2]`, etc.)
- Exact file paths are included in every task

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize Next.js App Router project and shared configuration

- [X] T001 Initialize Next.js 16 App Router TypeScript project with Tailwind CSS in repository root
- [X] T002 [P] Install core runtime dependencies (`@supabase/ssr`, `@supabase/supabase-js`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-checkbox`, `lucide-react`, `clsx`, `tailwind-merge`) in `package.json`
- [X] T003 [P] Install dev/testing dependencies (`vitest`, `@playwright/test`, `typescript`, `@types/node`, `@types/react`) in `package.json`
- [X] T004 [P] Configure Vitest runner in `vitest.config.ts` and Playwright configuration in `playwright.config.ts`
- [X] T005 Configure Tailwind CSS design tokens matching `DESIGN.md` "Calm Utility" (warm off-white canvas `#FBFBF9`, charcoal text `#2D2D2D`, muted steel blue accent `#3B6D9E`) in `tailwind.config.ts` and `src/app/globals.css`
- [X] T006 [P] Create class utility helper `cn()` in `src/lib/utils.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, RLS, types, auth proxy, RLS integration test, and developer owner provisioning

**CRITICAL**: Foundational tasks must complete before user story implementation begins.

- [X] T007 Configure repository-controlled local Supabase Auth settings in `supabase/config.toml` disabling general signup (`enable_signup = false`), email signup, and anonymous sign-ins while enabling password login; inspect connected development Supabase project via MCP and verify/configure remote Auth settings
- [X] T008 Author version-controlled SQL migration `supabase/migrations/20260926000000_core_planner.sql` defining:
  - `areas` table (`id uuid primary key default gen_random_uuid()`, `user_id uuid not null references auth.users(id) on delete cascade`, `name text not null check (char_length(trim(name)) > 0)`, `icon text not null default 'folder'`, `color_token text`, `sort_order integer not null default 0`, timestamps)
  - `items` table (`id uuid primary key default gen_random_uuid()`, `user_id uuid not null references auth.users(id) on delete cascade`, `parent_id uuid references public.items(id) on delete cascade`, `title text not null check (char_length(trim(title)) > 0)`, `description text`, `horizon text not null default 'inbox' check (horizon in ('inbox', 'day', 'week', 'month', 'year'))`, `period_start date`, `period_end date`, `time text check (time is null or time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')`, `area_id uuid references public.areas(id) on delete set null`, `weight double precision not null default 1.0 check (weight > 0)`, `status text not null default 'incomplete' check (status in ('incomplete', 'complete', 'cancelled'))`, `is_manually_completed boolean not null default false`, `sort_order integer not null default 0`, `completed_at timestamptz`, timestamps)
  - `item_not_self_parent` check (`parent_id is null or parent_id <> id`)
  - `item_schedule_integrity` check (`(horizon = 'inbox' and period_start is null and period_end is null and time is null) or (horizon = 'day' and period_start is not null and period_end = period_start) or (horizon in ('week', 'month', 'year') and period_start is not null and period_end is not null and period_end >= period_start and time is null)`)
  - `item_manual_completion_integrity` check (`not is_manually_completed or status = 'complete'`)
  - `user_preferences` table (`user_id uuid primary key references auth.users(id) on delete cascade`, `first_day_of_week text not null default 'monday' check (first_day_of_week in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'))`, timestamps)
  - Performance indexes on `(user_id, parent_id)`, `(user_id, horizon, period_start)`, `(user_id, area_id)`, and `(user_id, sort_order)`
  - RLS enabled on all three tables with `to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)`
- [X] T009 Apply migration via Supabase MCP `apply_migration` (or CLI) and generate authoritative TypeScript definitions to `src/types/database.types.ts`
- [X] T010 [P] Define domain model types and narrow unions (`Horizon`, `ItemStatus`, `WeekDay`, `ItemNode`) in `src/types/domain.ts`
- [X] T011 Implement idempotent developer owner provisioning script using the Supabase Auth Admin API (`auth.admin.createUser`) with `SUPABASE_SECRET_KEY` in `scripts/provision-owner.ts`
- [X] T012 Implement browser Supabase client using `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `src/lib/supabase/client.ts`
- [X] T013 Implement server Supabase client using `@supabase/ssr` cookies in `src/lib/supabase/server.ts`
- [X] T014 Implement session refresh helper in `src/lib/supabase/proxy.ts` and Next.js 16 root proxy in `src/proxy.ts` (Node.js runtime) protecting `/` and `/(planner)/*` while redirecting unauthenticated users to `/login`
- [X] T015 [P] Create reusable Radix UI primitives (`Button`, `Input`, `Textarea`, `Checkbox`, `Dialog`, `Sheet`, `DropdownMenu`) styled with Calm Utility tokens in `src/components/ui/`
- [X] T016 Write focused integration/security test in `tests/integration/rls.test.ts` verifying that unauthenticated/public clients cannot read, insert, update, or delete planning rows in `items`, `areas`, or `user_preferences`, while authenticated owner access succeeds

**Checkpoint**: Core foundation, database migration, RLS policies, RLS integration test, and auth proxy ready.

---

## Phase 3: User Story 2 - Single-User Authentication and Personal Workspace Security (Priority: P1)

**Goal**: Deliver secure personal authentication gating all planner routes without public signup UI.

**Independent Test**: Navigate to `/today` unauthenticated (verify redirect to `/login`), sign in with owner credentials (verify access to planner), reload (verify session persistence), and sign out (verify redirect back to `/login`).

### Tests for User Story 2
- [X] T017 [P] [US2] Write Playwright end-to-end test for login flow, session persistence across page reloads, sign-out, and unauthenticated route redirection in `tests/e2e/auth.spec.ts`

### Implementation for User Story 2
- [X] T018 [US2] Implement root route redirecting authenticated users to `/today` and unauthenticated visitors to `/login` in `src/app/page.tsx`
- [X] T019 [US2] Implement calm single-user login page with email and password inputs adhering to `DESIGN.md` in `src/app/(auth)/login/page.tsx`
- [X] T020 [US2] Implement Server Actions for `signIn` (using Supabase `signInWithPassword` to establish session and redirect to `/today`) and `signOut` (using Supabase `signOut` without redundant claim ceremony) in `src/app/(auth)/actions.ts`

**Checkpoint**: Authentication gate is complete and independently testable via `tests/e2e/auth.spec.ts`.

---

## Phase 4: User Story 1 - Fast Daily Execution and Frictionless Quick Capture (Priority: P1) [MVP Candidate]

**Goal**: Deliver the primary home screen (`/today`) with fast title-only Quick Add, lightweight optional Time affordance, Anytime vs. Timed sections, and leaf item completion toggling.

**Independent Test**: Load `/today`, capture a task in <3 seconds using Quick Add, verify it appears in `Anytime`, create/set a Day task with time via Quick Add affordance to verify it appears in `Timed`, toggle completion circle to 100%, and uncheck to return to 0%.

### Tests for User Story 1
- [X] T021 [P] [US1] Write Playwright test for Today home screen, title-only Quick Add creation (Anytime), Quick Add with optional time (Timed), and leaf completion toggle in `tests/e2e/today.spec.ts`

### Implementation for User Story 1
- [X] T022 [P] [US1] Implement responsive planner layout shell with desktop sidebar and mobile bottom navigation in `src/app/(planner)/layout.tsx`, `src/components/shell/desktop-sidebar.tsx`, and `src/components/shell/mobile-nav.tsx`
- [X] T023 [P] [US1] Implement frictionless Quick Add input component inferring active context by default and exposing a lightweight optional `+ Time` affordance in `src/components/planner/quick-add.tsx`
- [X] T024 [P] [US1] Implement compact item row component displaying title, completion toggle, time, and Area badge in `src/components/planner/item-row.tsx`
- [X] T025 [US1] Implement Server Actions for `createItem` (accepting title and optional valid Day `time` string) and `toggleItemCompletion` verifying authenticated claims via `supabase.auth.getClaims()` and deriving owner user ID server-side in `src/app/(planner)/actions.ts`
- [X] T026 [US1] Implement Today page Server Component fetching user items in a single user-scoped load, grouping into Anytime and Timed sections, and rendering context area in `src/app/(planner)/today/page.tsx`

**Checkpoint**: Core MVP is functional. User can sign in, view Today, capture tasks with optional time, and toggle completion.

---

## Phase 5: User Story 3 - Unlimited Hierarchy and Context-Inheriting Child Creation (Priority: P2)

**Goal**: Support arbitrary parent/child nesting depth with cycle prevention and automatic context inheritance on child creation.

**Independent Test**: Create an item, add a child under it, verify `parent_id` is set, verify Area inheritance, verify child Day item inherits parent date without required time, and verify expand/collapse state.

### Tests for User Story 3 (TDD)
- [X] T027 [P] [US3] Write failing unit tests for tree assembly, descendant collection, and cycle prevention (`wouldCreateCycle`) in `tests/unit/hierarchy.test.ts`
- [X] T028 [P] [US3] Write Playwright test for child task creation, context inheritance, and expand/collapse disclosure in `tests/e2e/hierarchy.spec.ts`

### Implementation for User Story 3
- [X] T029 [US3] Implement pure domain functions `buildTree(items)`, `wouldCreateCycle(items, itemId, candidateParentId)`, and `getDescendants(items, parentId)` in `src/domain/hierarchy.ts` (pass T027)
- [X] T030 [US3] Implement expandable hierarchy tree component managing local expansion state (`Set<string>`) in `src/components/planner/item-tree.tsx`
- [X] T031 [US3] Implement inline child creation trigger applying Area and Day date inheritance rules in `src/components/planner/item-row.tsx`
- [X] T032 [US3] Add `createChildItem` Server Action verifying parent ownership via `supabase.auth.getClaims()` before persisting in `src/app/(planner)/actions.ts`

**Checkpoint**: Tree hierarchy supports arbitrary depth and intelligent inheritance without cycles.

---

## Phase 6: User Story 4 - Recursive Weighted Progress Calculation (Priority: P2)

**Goal**: Calculate deterministic parent progress recursively as a weighted average of direct children, excluding cancelled items.

**Independent Test**: Create parent with child weight 1 and child weight 3; verify 25% progress on completing child 1, 100% on completing child 2, and exclusion of cancelled children from parent progress.

### Tests for User Story 4 (TDD)
- [X] T033 [P] [US4] Write failing unit tests for recursive weighted progress formulas (leaf binary 0/100, custom relative weights, zero-weight safeguard, cancelled item exclusion, ancestor upward propagation) in `tests/unit/progress.test.ts`

### Implementation for User Story 4
- [X] T034 [US4] Implement pure domain progress calculator `calculateItemProgress(item, childrenMap)` and tree progress evaluator in `src/domain/progress.ts` (pass T033)
- [X] T035 [US4] Integrate dynamic progress percentage display and progress indicators into `src/components/planner/item-row.tsx`
- [X] T036 [US4] Connect tree assembly in Server Components to dynamically evaluate progress on full-tree projection in `src/domain/hierarchy.ts`

**Checkpoint**: Progress evaluates deterministically across all nesting depths without mutable database progress columns.

---

## Phase 7: User Story 5 - Direct Parent Completion with Descendant Resolution (Priority: P2)

**Goal**: Provide a 3-option confirmation dialog when completing a parent with incomplete descendants ("Complete parent only", "Complete parent and all descendants", "Cancel").

**Independent Test**: Complete a parent with uncompleted children; choose "Complete parent only" (parent shows 100% with manual badge, children remain incomplete); reopen parent (reverts to calculated progress); choose "Complete parent and all descendants" (all descendants mark 100%).

### Tests for User Story 7
- [X] T037 [P] [US5] Add unit tests for parent manual-completion state transitions and reopening logic in `tests/unit/progress.test.ts`
- [X] T038 [P] [US5] Write Playwright test for the 3-option parent completion resolution dialog in `tests/e2e/parent-completion.spec.ts`

### Implementation for User Story 5
- [X] T039 [US5] Implement 3-option completion resolution dialog component in `src/components/planner/completion-dialog.tsx`
- [X] T040 [US5] Implement Server Actions for `resolveParentCompletion` (handling "parent only" with `is_manually_completed = true` vs. cascading descendants complete) and `reopenParent` in `src/app/(planner)/actions.ts`
- [X] T041 [US5] Update `src/components/planner/item-row.tsx` to intercept parent completion clicks and display the manual completion badge when `is_manually_completed = true`

**Checkpoint**: Direct parent completion works with full descendant state preservation and reopening support.

---

## Phase 8: User Story 6 - Categorization with Areas & Preserved Hierarchy Filtering (Priority: P3)

**Goal**: Support Area assignment and single-Area view filtering with contextual non-matching ancestor visibility.

**Independent Test**: Assign Area to items; select Area filter in navigation; verify matching items appear, non-matching ancestors remain as de-emphasized context rows, unrelated branches are hidden, and clearing filter restores all items.

### Tests for User Story 8
- [X] T042 [P] [US6] Write failing unit tests for Area filtering projection with contextual ancestor rows in `tests/unit/hierarchy.test.ts`
- [X] T043 [P] [US6] Write Playwright test for Area filtering and filter-clearing behavior in `tests/e2e/area-filter.spec.ts`

### Implementation for User Story 8
- [X] T044 [US6] Implement pure domain filtering function `filterTreeByArea(nodes, selectedAreaId)` in `src/domain/hierarchy.ts` (pass T042)
- [X] T045 [US6] Implement single-Area filter selector and "Clear Filter" control reading/writing URL search params (`?area=<id>`) in `src/components/planner/area-filter.tsx`
- [X] T046 [US6] Update `src/components/planner/item-row.tsx` to visually de-emphasize contextual ancestor rows (non-matches) during active Area filtering

**Checkpoint**: Single-Area filtering preserves tree context without modifying database hierarchy.

---

## Phase 9: User Story 7 - Planning Horizons Navigation (Day, Week, Month, Year) & Settings (Priority: P3)

**Goal**: Deliver dedicated views for Inbox, Week, Month, and Year with explicit previous/next period navigation, period-bound Quick Add, and the `/settings` screen.

**Independent Test**: Navigate across Today, Inbox, Week, Month, Year; transition previous/next period in Week/Month/Year; verify Quick Add creates items matching the active period; visit `/settings`; change `first_day_of_week` to Sunday (verifying Week view updates partition); create, edit, and delete an Area.

### Tests for User Story 9 (TDD)
- [X] T047 [P] [US7] Write failing unit tests for week boundary calculations across all 7 weekdays (`monday`..`sunday`) and calendar date range formatters in `tests/unit/calendar.test.ts`
- [X] T048 [P] [US7] Write Playwright test for horizon views, previous/next period navigation transitions, Quick Add targeting selected period, and Settings preferences / Area CRUD in `tests/e2e/horizons.spec.ts`

### Implementation for User Story 9
- [X] T049 [US7] Implement calendar math functions `getWeekBoundaries(date, firstDayOfWeek)` and period range helpers in `src/domain/calendar.ts` (pass T047)
- [X] T050 [P] [US7] Implement Inbox view Server Component with Quick Add for unscheduled items in `src/app/(planner)/inbox/page.tsx`
- [X] T051 [P] [US7] Implement Week view Server Component with previous/next week navigation, primary week items, day breakdown, and week-bound Quick Add in `src/app/(planner)/week/page.tsx`
- [X] T052 [P] [US7] Implement Month view Server Component with previous/next month navigation and month-bound Quick Add in `src/app/(planner)/month/page.tsx`
- [X] T053 [P] [US7] Implement Year view Server Component with previous/next year navigation and year-bound Quick Add in `src/app/(planner)/year/page.tsx`
- [X] T054 [US7] Implement Settings page with `first_day_of_week` selector and Area CRUD (list, create, edit, delete) in `src/app/(planner)/settings/page.tsx`
- [X] T055 [US7] Implement Server Actions for `updatePreferences` (lazy upsert on `user_preferences`), `createArea`, `updateArea`, and `deleteArea` in `src/app/(planner)/actions.ts`

**Checkpoint**: Full horizon navigation with period switching and Settings surface operational.

---

## Phase 10: User Story 8 - Responsive Shell, Item Details, Sibling Reordering, and Error Feedback (Priority: P3)

**Goal**: Deliver desktop right-side detail drawer, mobile bottom sheet, parent reassignment cycle prevention, completion invariant protection, subtree deletion confirmation, desktop/mobile/keyboard reordering, and actionable failure feedback.

**Independent Test**: Open item detail drawer (desktop) and sheet (mobile); edit fields; verify reassigning parent to self or descendant is rejected; verify changing status to Complete on parent routes to 3-option flow; verify Cancel marks cancelled without deletion; reorder siblings via pointer, mobile touch handles, and keyboard (verify integer order persists); delete parent with subtasks (verify confirmation prompt with descendant count); simulate mutation failure and verify calm error display preserving input.

### Tests for User Story 10 (TDD)
- [X] T056 [P] [US8] Write failing unit tests for sibling integer array reordering math in `tests/unit/reorder.test.ts`
- [X] T057 [P] [US8] Write Playwright test for Item detail drawer/sheet editing, parent reassignment cycle rejection, Cancel/Reopen status toggling, subtree deletion confirmation, desktop mouse reorder, mobile touch handle reorder, and keyboard reordering in `tests/e2e/details-reorder.spec.ts`

### Implementation for User Story 10
- [X] T058 [US8] Implement pure domain reorder helper `reorderSiblingList(siblings, sourceIndex, targetIndex)` in `src/domain/reorder.ts` (pass T056)
- [X] T059 [US8] Implement Item detail drawer (desktop) and bottom sheet (mobile) in `src/components/planner/item-detail.tsx` supporting title, description, horizon, period, Day time, Area, weight, parent reassignment, Cancel status action, Reopen action, and subtree deletion confirmation with affected descendant count
- [X] T060 [US8] Implement `@dnd-kit` sortable wrapper with Pointer, Touch (with delay/distance handles), and Keyboard sensors for same-list ordering in `src/components/planner/item-tree.tsx`
- [X] T061 [US8] Implement Server Actions for `updateItemDetails` (enforcing `wouldCreateCycle` on parent reassignment and prohibiting completion backdoors that bypass the 3-option prompt), `reorderItems` (persisting sequential integer `sort_order`), and `deleteItemSubtree` (cascading delete) in `src/app/(planner)/actions.ts`
- [X] T062 [P] [US8] Implement calm empty states, quiet loading skeletons, and actionable failure feedback components (preserving user input without crashing or silent data loss) in `src/components/planner/empty-state.tsx`, `src/components/planner/loading-skeleton.tsx`, and `src/components/planner/action-error.tsx`

**Checkpoint**: All interactive details, responsive surfaces, reordering workflows, and error states are complete.

---

## Phase 11: Polish & Cross-Cutting Verification

**Purpose**: System verification, security audit, and quality gates prior to feature completion

- [X] T063 Execute Supabase MCP `get_advisors` (or `supabase db advisors`) to verify RLS coverage, index health, and security compliance
- [X] T064 [P] Execute all unit domain tests via `npm run test:unit` and verify 100% pass rate
- [X] T065 [P] Execute RLS integration test via `npm run test:integration` (or `npx vitest run tests/integration/rls.test.ts`) and verify security isolation
- [X] T066 [P] Execute all Playwright end-to-end user journeys via `npx playwright test` and verify 100% pass rate on desktop and mobile viewports
- [X] T067 Run TypeScript compilation check via `npx tsc --noEmit` and ESLint via `npm run lint`
- [X] T068 Run production Next.js build via `npm run build` and confirm zero build errors
- [X] T069 Validate complete runnable scenarios against `specs/001-core-planner/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 (Setup)**: Can start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1. BLOCKS all user stories.
- **Phase 3 (US2 - Auth)**: Depends on Phase 2. Gating prerequisite for all authenticated views.
- **Phase 4 (US1 - Today & Quick Add)**: Depends on Phase 3 (MVP milestone!).
- **Phase 5 (US3 - Hierarchy)**: Depends on Phase 4.
- **Phase 6 (US4 - Progress)**: Depends on Phase 5.
- **Phase 7 (US5 - Parent Completion)**: Depends on Phase 6.
- **Phase 8 (US6 - Areas & Filter)**: Depends on Phase 5.
- **Phase 9 (US7 - Horizons & Settings)**: Depends on Phase 4.
- **Phase 10 (US8 - Details, Reordering & Error States)**: Depends on Phase 5.
- **Phase 11 (Polish & Verification)**: Depends on completion of all desired user stories.

### User Story Dependency Graph

```text
[Phase 1: Setup] ──> [Phase 2: Foundational]
                             │
                             ▼
                 [Phase 3: US2 (Auth)]
                             │
                             ▼
                 [Phase 4: US1 (Today / Quick Add)] ──> (MVP Complete)
                   /         │         \
                  /          │          \
                 ▼           │           ▼
      [Phase 5: US3 (Tree)]  │  [Phase 9: US7 (Horizons/Settings)]
        /     │     \        │
       /      │      \       │
      ▼       ▼       ▼      │
    [US4]   [US6]   [US8]    │
   Progress Areas  Details   │
      │                      │
      ▼                      │
    [US5]                    │
  Parent Comp                │
       \                     /
        \                   /
         ▼                 ▼
      [Phase 11: Polish & Verification]
```

---

## Parallel Opportunities

- **Phase 1**: T002, T003, T004, and T006 can run concurrently.
- **Phase 2**: T010, T011, and T015 can run in parallel while database migration is applied.
- **Phase 4**: T022, T023, and T024 can run concurrently.
- **Phase 5**: T027 (unit tests) and T028 (E2E test) can be authored in parallel.
- **Phase 9**: T050, T051, T052, and T053 (horizon views) can run concurrently.
- **Phase 11**: T064, T065, and T066 (unit, RLS, and E2E test runs) can run in parallel.

---

## Implementation Strategy: MVP First

1. **Step 1**: Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. **Step 2**: Complete Phase 3 (User Story 2: Auth).
3. **Step 3**: Complete Phase 4 (User Story 1: Today & Quick Add with time affordance).
4. **STOP & VALIDATE**: Test User Story 1 independently. At this milestone, the owner can log in, view Today, capture tasks with optional time, and toggle completion. This forms the working MVP.
5. **Incremental Delivery**: Sequentially deliver Phase 5 (Hierarchy) -> Phase 6 (Progress) -> Phase 7 (Parent Completion) -> Phase 8 (Areas) -> Phase 9 (Horizons & Settings) -> Phase 10 (Details, Reordering & Error States).
6. **Final Gate**: Execute Phase 11 for complete automated verification, production Next.js build, and Supabase advisor compliance.
7. **UAT Stabilization**: Execute Phase 12 to resolve confirmed human UAT and external source audit findings, preserving the approved Slice 1 scope and Calm Utility visual direction.

---

## Phase 12 — UAT Stabilization

- [x] T068 [P0]: Fix Item Detail scheduling corruption in `src/components/planner/item-detail.tsx`: preserve existing periodEnd/periodStart or compute full calendar boundaries (Week, Month, Year); do not overwrite `periodEnd = periodStart` on save.
- [x] T069 [P0]: Fix full-tree progress calculation: load complete items collection, compute recursive progress on the full tree, then project into horizon/area views (independent hierarchy and scheduling).
- [x] T070 [P0]: Fix child creation scheduling inheritance in `src/app/(planner)/actions.ts`: only Day parent passes Day horizon and date; Inbox/Week/Month/Year parents create unscheduled Inbox children retaining `parent_id` and Area.
- [x] T071 [P0]: Fix mobile Plan navigation in `src/components/shell/mobile-nav.tsx`: replace static `/week` link with a mobile planning chooser (Week, Month, Year) using a compact sheet/popover. Add real mobile Playwright test.
- [x] T072 [P0]: Make subtasks discoverable on touch: provide touch-visible Add Subtask actions on mobile rows, in expanded subtrees, and in Item Detail.
- [x] T073 [P1]: Progressive disclosure in Quick Add: add compact optional creation controls (Area, Parent, Day Time/Date) without creating a giant modal.
- [x] T074 [P1]: Add Day task creation directly from Week view: provide subtle `+ Add task` action per day breakdown section with automatic day scheduling.
- [x] T075 [P1]: Implement semantic Area colors: 8-10 muted palette choices, persist in `areas.color_token`, editable in Settings, and displayed on sidebar dots and item badges.
- [x] T076 [P1]: Clarify progress weight: rename field to "Progress weight", add concise helper text, de-emphasize for root items, and display relative contribution percentage among siblings.
- [x] T077 [P1]: Lightweight Month and Year breakdowns: provide drill-down context paths into constituent weeks and months.
- [x] T078 [P1]: Fix Today planning context: display only relevant current Week, Month, and Year items using local boundaries and true tree progress.
- [x] T079 [P1]: Fix Parent picker scope in Item Detail: populate candidate parents from full user item collection, excluding self and descendants via `wouldCreateCycle`.
- [x] T080 [P1]: Support nested same-parent sibling reordering: enable sibling reordering at arbitrary nesting depths without cross-parent movement.
- [x] T081 [P1]: Recursive subtree delete count: compute and display total affected descendants at all depths in `deleteItemSubtree` confirmation dialog.
- [x] T082 [P1]: Recursive parent completion descendant check: verify if any descendant at any depth is incomplete before triggering the 3-option resolution dialog.
- [x] T083 [P1]: Preserve cross-horizon context in Area filter: retain dim contextual ancestors when descendant matches active Area.
- [x] T084 [P2]: Local date correctness: replace UTC `toISOString().split('T')[0]` with local calendar date helper.
- [x] T085 [P2]: Cancel + manual completion integrity: reset `is_manually_completed` to false when cancelling or reopening an item.
- [x] T086 [P2]: Fail fast on missing Supabase environment variables: throw clear errors during setup instead of silently falling back to production URL.
- [x] T087 [Perf]: Measure navigation latency in dev and prod mode, eliminate request waterfalls using `Promise.all` and request-scoped deduplication, add `loading.tsx` route boundaries with `LoadingSkeleton`.
- [x] T088 [Verification]: Run comprehensive test suite, TypeScript, ESLint, production build, desktop/mobile exploratory pass, and `$speckit-converge`.


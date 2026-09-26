# Implementation Plan: Core Planner (Slice 1)

**Branch**: `001-core-planner` | **Date**: 2026-09-26 | **Spec**: [specs/001-core-planner/spec.md](spec.md)

**Input**: Feature specification from `/specs/001-core-planner/spec.md`

---

## Summary

Build a lean, robust, personal single-user planning application delivering **Slice 1 — Core Planner**. The technical implementation is anchored on Next.js App Router (React 19, TypeScript) and PostgreSQL on Supabase. Authenticated data loading runs in Server Components, while rich interactions (expandable tree hierarchy, Quick Add, same-parent reordering, item detail inspection, Area filtering, and preferences) run in focused Client Components. Core domain behavior (recursive weighted progress, hierarchy cycle prevention, context inheritance, and weekday boundary logic) is implemented as isolated, deterministic TypeScript functions covered thoroughly by unit tests. The visual design adheres strictly to `DESIGN.md` "Calm Utility" principles.

---

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ (LTS)

**Primary Dependencies**:
- `next` (App Router, Server Actions, Server Components)
- `react`, `react-dom`
- `@supabase/ssr`, `@supabase/supabase-js` (Auth, database client, cookie-based SSR session management)
- `@dnd-kit/core`, `@dnd-kit/sortable` (same-list / same-parent reordering with pointer, touch, and keyboard accessibility)
- `@radix-ui/react-*` (primitives for Dialog, Sheet, Checkbox, DropdownMenu via shadcn/ui)
- `tailwindcss` (utility-first styling adhering to `DESIGN.md` design tokens)
- `lucide-react` (restrained iconography)

**Storage**: PostgreSQL 15+ on Supabase with migrations in `supabase/migrations/` and Row Level Security (RLS) on all tables.

**Testing**:
- **Unit / Domain**: `vitest` for pure TypeScript domain rules (progress, weights, cycle prevention, calendar math).
- **End-to-End**: `playwright` for critical browser user journeys (desktop and mobile viewports).

**Target Platform**: Modern desktop browsers (>=1024px) and mobile browsers (<768px).

**Project Type**: Full-stack Next.js web application.

**Performance Goals**:
- <3 seconds to capture a thought via Quick Add from cold start.
- Immediate tree updates without manual page reload.
- Single user-scoped query for full tree loading in memory with pure projection across views (no recursive RPCs or network cascades).

**Constraints**:
- Single-user architecture: zero public registration forms or multi-tenant roles. Public signups disabled at Supabase Auth configuration level.
- No ORM (direct Supabase client with generated TypeScript types).
- No Supabase Realtime in Slice 1.
- No client-side global state store (no Redux, Zustand, MobX).
- Strict adherence to `DESIGN.md` (no AI purple/blue gradients, no glowing borders, no card soup).
- Strict Slice 1 boundaries (no Move workflows, rollover, recurrence, reminders, templates, or bulk actions).

**Scale/Scope**: Single user personal planner (<10,000 items, 1 concurrent user, high reliability).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Gate Status | Verification in Plan |
| :--- | :--- | :--- |
| **I. Personal-First Simplicity** | **PASS** | Architecture is single-user only. Direct owner provisioning, public signup disabled at Auth config level, zero organizations, zero billing, zero microservices, zero enterprise layers. |
| **II. Interaction Speed** | **PASS** | Frictionless Quick Add, context inheritance on child creation, desktop drag-and-drop, mobile touch handles, keyboard reorder, inline editing. |
| **III. Deterministic Domain Logic** | **PASS** | Progress calculation, cycle prevention, and calendar math live in pure TypeScript modules (`src/domain/`) outside React components. |
| **IV. Test Behavior, Not Ceremony** | **PASS** | Vitest tests domain rules directly; Playwright tests critical E2E flows. Zero test bloat or snapshot spam. |
| **V. Personal Data & Schema Integrity** | **PASS** | Supabase Auth with RLS on all tables. No service-role key exposed to clients. Version-controlled SQL migrations. Strict SQL schedule and completion check constraints. |
| **VI. Evidence Before Completion** | **PASS** | Plan incorporates verification commands, unit tests, and Playwright suites before completing features. |
| **VII. Design Restraint** | **PASS** | Follows `DESIGN.md` "Calm Utility" tokens: warm neutral canvas, warm charcoal text, muted steel blue accent. Anti-slop rules enforced. |
| **VIII. Spec-Driven Development** | **PASS** | Plan strictly corresponds to `specs/001-core-planner/spec.md` with full traceability. |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-core-planner/
├── plan.md              # This technical implementation plan
├── research.md          # Technical research & architectural decisions
├── data-model.md        # PostgreSQL schema, RLS, and TypeScript interfaces
├── quickstart.md        # Runnable verification and validation scenarios
├── checklists/
│   └── requirements.md  # Specification quality checklist
└── spec.md              # Authoritative feature specification
```

### Source Code Layout

```text
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx         # Calm owner Sign In page
│   ├── (planner)/
│   │   ├── layout.tsx           # Shell layout: desktop sidebar & mobile bottom nav
│   │   ├── today/
│   │   │   └── page.tsx         # Today home screen (Anytime + Timed + context area)
│   │   ├── inbox/
│   │   │   └── page.tsx         # Inbox view (unscheduled items)
│   │   ├── week/
│   │   │   └── page.tsx         # Week view (week items + day-by-day breakdown)
│   │   ├── month/
│   │   │   └── page.tsx         # Month view (month items + calendar progress)
│   │   ├── year/
│   │   │   └── page.tsx         # Year view (year items + month progress)
│   │   ├── settings/
│   │   │   └── page.tsx         # Minimal settings: first_day_of_week & Area CRUD
│   │   └── actions.ts           # Server Actions (item mutations, revalidatePath)
│   ├── page.tsx                 # Root route: redirects to /today
│   ├── globals.css              # Calm utility theme variables
│   └── layout.tsx               # Root HTML shell
├── components/
│   ├── ui/                      # Restrained Radix/shadcn primitives
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── checkbox.tsx
│   │   ├── sheet.tsx            # Desktop drawer / mobile sheet
│   │   ├── dialog.tsx           # Completion confirmation dialog
│   │   └── dropdown-menu.tsx
│   ├── planner/
│   │   ├── item-tree.tsx        # Interactive expandable hierarchy tree with reordering
│   │   ├── item-row.tsx         # Compact row: checkbox, title, badge, disclosure
│   │   ├── item-detail.tsx      # Drawer/sheet content for editing item fields
│   │   ├── quick-add.tsx        # Title-only fast capture input
│   │   ├── completion-dialog.tsx# 3-option parent completion prompt
│   │   └── area-filter.tsx      # Single-Area filter toggle and clear control
│   └── shell/
│       ├── desktop-sidebar.tsx  # Left navigation pane for desktop (links to settings)
│       └── mobile-nav.tsx       # Bottom navigation bar for mobile ('More' links to settings)
├── domain/                      # PURE, INDEPENDENTLY TESTABLE DOMAIN LOGIC
│   ├── progress.ts              # Recursive weighted progress calculation
│   ├── hierarchy.ts             # Tree assembly, projection, and cycle prevention
│   ├── calendar.ts              # Week boundaries & period calculations for 7 weekdays
│   └── reorder.ts               # Same-parent sibling integer sort_order calculations
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser client (createBrowserClient)
│   │   ├── server.ts            # Server client (createServerClient with cookies)
│   │   └── proxy.ts             # Auth session refresh helper for root proxy
│   └── utils.ts                 # Classname merge (clsx/twMerge)
├── types/
│   ├── database.types.ts        # Generated Supabase PostgreSQL database types
│   └── domain.ts                # Domain entity and tree node interfaces
├── scripts/
│   └── provision-owner.ts       # Idempotent developer owner provisioning via Auth Admin API
└── proxy.ts                     # Next.js 16 Proxy route protection & auth token refresh (Node.js runtime)

supabase/
└── migrations/
    └── 20260926000000_core_planner.sql # Tables, check constraints, indexes, RLS policies

tests/
├── unit/                        # Fast Vitest domain tests
│   ├── progress.test.ts         # Progress math, zero weight, cancelled exclusion
│   ├── hierarchy.test.ts        # Tree building, cycle prevention
│   ├── calendar.test.ts         # 7-day start-of-week boundaries
│   └── reorder.test.ts          # Same-parent sort ordering math
└── e2e/                         # Playwright user journey tests
    ├── auth.spec.ts             # Sign in, session persistence, sign out, root redirect
    ├── today.spec.ts            # Quick Add, Anytime vs Timed, completion toggle
    ├── hierarchy.spec.ts        # Child creation, context inheritance, expand/collapse
    ├── parent-completion.spec.ts# 3-option resolution prompt verification
    ├── reorder.spec.ts          # Desktop drag-and-drop & keyboard reordering
    ├── area-filter.spec.ts      # Single-Area filtering with contextual ancestors
    └── settings.spec.ts         # First day of week preference & Area CRUD
```

**Structure Decision**: A clean single-project Next.js App Router structure with distinct separation between presentation (`components/`, `app/`), pure domain calculations (`domain/`), and database clients (`lib/supabase/`). No artificial repository, service, or controller boilerplate.

---

## Detailed Component & Subsystem Architecture

### 1. High-Level Architecture & In-Memory Tree Projection
- **Single User-Scoped Query**: Because hierarchy and scheduling are independent, an item's descendants may be scheduled outside the currently viewed calendar period, but they must still contribute to that item's recursive progress and be visible when expanding its hierarchy.
  - Server Components fetch all items for the authenticated user in one indexed query: `SELECT * FROM items WHERE user_id = auth.uid() ORDER BY sort_order ASC`.
  - Pure domain function `buildTree(items)` in `src/domain/hierarchy.ts` assembles the tree and evaluates recursive progress for all nodes in memory.
  - The view projects/filters the tree for display (Today items, Week items with day breakdown, Month items, Year items, Inbox items, or single-Area filtered views with contextual ancestors).
  - This guarantees 100% hierarchy and progress correctness with zero recursive database RPCs, zero recursive network cascades, and zero cache invalidation bugs.
- **Server Actions for Mutations**: Data updates (`createItem`, `updateItem`, `deleteItemSubtree`, `reorderItems`, `completeItem`, `reopenItem`, `updatePreferences`, `createArea`, `updateArea`, `deleteArea`) are executed via Server Actions defined in `app/(planner)/actions.ts`.
  - Every Server Action derives and verifies the authenticated user server-side via `supabase.auth.getClaims()` (or `getUser()` only when a fresh server record is required). Server Actions **MUST NOT** accept or trust a `user_id` supplied by the client.
  - Upon successful mutation, `revalidatePath` ensures data stays fresh across views.
- **Client-Side Tree Interaction**: `ItemTree` manages local expansion states (`Set<string>`) and reorder interactions via `@dnd-kit`.

### 2. Database & Data Model
- Exactly three tables: `items`, `areas`, `user_preferences`.
- All tables have `user_id` referencing `auth.users(id)` with cascading deletes.
- Self-referencing hierarchy on `items.parent_id` with `ON DELETE CASCADE`.
- Row Level Security enabled on all tables using `(select auth.uid()) = user_id`.
- Strict SQL schedule and completion integrity constraints:
  - **Inbox**: `period_start is null and period_end is null and time is null`.
  - **Day**: `period_start is not null and period_end = period_start` (`time` may be null or valid `HH:mm`).
  - **Week / Month / Year**: `period_start is not null and period_end is not null and period_end >= period_start and time is null`.
  - **Completion Integrity**: `not is_manually_completed or status = 'complete'`.
- Sibling ordering uses simple integer `sort_order` values.
- Indexes placed on `(user_id, parent_id)`, `(user_id, horizon, period_start)`, and `(user_id, area_id)`.
- No event-history, recurrence, reminder, or analytics tables in Slice 1.

### 3. Supabase Auth Approach
- Single-user email/password login at `/login` using `signInWithPassword`.
- Session managed via cookie-based SSR sessions using `@supabase/ssr`.
- Next.js root `proxy.ts` (Next.js 16 convention running under standard Node.js runtime behavior) and `lib/supabase/proxy.ts` refresh tokens via `createServerClient` and redirect unauthenticated users to `/login`.
- **Identity Verification**: For route protection and data loading, verify identity using `supabase.auth.getClaims()` and obtain the owner ID from verified claims. Never trust `getSession().user` as authorization evidence. Use `supabase.auth.getUser()` only when a fresh user record from the Auth server is required.
- **Account creation disabled at configuration level**: `"Allow new users to sign up" = false` and anonymous sign-ins disabled in production Supabase Auth config.
- **Local Configuration**: `supabase/config.toml` includes local Auth configuration disabling general signup (`enable_signup = false`), email signup, and anonymous sign-ins, while keeping sign-in enabled for the provisioned owner.
- **Zero-Manual-Supabase Owner Provisioning**: Normal development setup is automated via `scripts/provision-owner.ts` using the Supabase Auth Admin API (`auth.admin.createUser`) with `SUPABASE_SECRET_KEY`. It is idempotent and safe to run repeatedly. Supabase Studio/Dashboard is an emergency manual fallback.
- **No Public Signup UI**: No registration forms, no invitations, no admin portals, and no callback route (`/api/auth/callback` omitted).
- **Environment Variables**: Follow current official Supabase guidance: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for browser-safe access; `SUPABASE_SECRET_KEY` strictly for server/test administration (never committed or exposed to browser code). Avoid legacy `anon` and `service_role` terminology.

### 4. Item Tree & Context Inheritance
- `buildTree(items)` in `src/domain/hierarchy.ts` converts a flat list of items into nested `ItemNode[]` with direct children arrays.
- `wouldCreateCycle(items, itemId, newParentId)` prevents assigning an item's parent to itself or to any of its own descendants.
- Context Inheritance on child creation:
  - Child created under parent inherits `parent_id = parent.id`.
  - Child inherits `area_id = parent.area_id` if parent has an area.
  - If parent has `horizon = 'day'`, child inherits `horizon = 'day'`, `period_start = parent.period_start`, `period_end = parent.period_end`, and `time = null`.
  - If parent has another horizon (`week`, `month`, `year`, `inbox`), scheduling remains independent.

### 5. Progress Calculation Engine
- Pure TypeScript function `calculateItemProgress(item, childrenMap)` in `src/domain/progress.ts`.
- Leaf items: `complete` -> 100%, `incomplete` -> 0%.
- Parent items:
  - If `is_manually_completed === true`: returns 100%.
  - Otherwise: evaluates weighted average of non-cancelled direct children:
    $$\text{Progress} = \frac{\sum (\text{weight}_i \times \text{progress}_i)}{\sum \text{weight}_i}$$
  - Cancelled children are completely omitted from numerator and denominator.
  - If sum of active child weights is 0 or all children are cancelled: returns 0%.
- Progress is never saved to the database; it is computed on-the-fly during tree assembly.

### 6. Week and Calendar Period Calculations
- Pure TypeScript module `src/domain/calendar.ts`.
- `getWeekBoundaries(date, firstDayOfWeek)` computes the start and end dates for a given calendar week, supporting all seven weekdays (`monday`..`sunday`).
- Changing `first_day_of_week` in `user_preferences` changes the visual week partition for views without rewriting historical item date strings.
- Today context area shows relevant current Week, Month, and Year Items and each item's tree-calculated progress; no synthetic calendar-wide progress averages are calculated.

### 7. Same-List Sibling Reordering
- Uses `@dnd-kit/core` and `@dnd-kit/sortable` with `PointerSensor` (desktop mouse), `TouchSensor` with delay/distance activation (mobile touch handles), and `KeyboardSensor` (accessible keyboard navigation).
- Siblings under the same parent (or root siblings in a list) use sequential integer `sort_order` values (`0, 1, 2, ...`).
- When an item is moved from index $A$ to index $B$, the sibling array is spliced in memory, sequential integer indices are assigned, and the updated siblings are persisted via Server Action.
- Cross-period dragging between different dates or horizons is strictly disabled. No LexoRank, fractional positions, or rebalancing algorithms.

### 8. Hierarchy-Preserving Area Filtering
- When an Area filter is active (via URL parameter `?area=<area_id>`):
  - Matching items assigned to the selected Area are displayed as active matches.
  - Non-matching ancestor items required to preserve tree position context for matching descendants are retained as visually de-emphasized contextual ancestor rows (and are not treated or counted as Area matches).
  - Unrelated branches containing no matching descendants are hidden.
  - A prominent "Clear Filter" button in the shell clears the URL parameter.
  - Filtering is strictly a read-time projection; it never mutates database rows.

### 9. Settings & Minimal Area Management Surface
- Route: `/settings` (`src/app/(planner)/settings/page.tsx`).
- **Planning Preferences**: Allows the user to select any of the 7 weekdays (`monday`..`sunday`) as `first_day_of_week`.
- **UserPreferences Row Initialization**: If an authenticated owner has no preferences record, application logic defaults to `first_day_of_week = 'monday'`. The `/settings` page displays this effective default. Updating or saving the preference executes an `UPSERT` on `user_preferences(user_id)`. No manual database seeding or Auth triggers are required.
- **Area Management**: Simple list of areas with inline/modal actions to create an area, edit its name/icon, or delete it.
- Desktop left sidebar and mobile `More` navigation provide direct links to `/settings`.
- Minimal root route (`app/page.tsx`) redirects to `/today` (unauthenticated sessions redirected to `/login` by `proxy.ts`).

### 10. Supabase MCP Operational Workflow
- **Repository as Source of Truth**: All schema changes are maintained as version-controlled migration files in `supabase/migrations/`.
- **Migration Application**: ZCode applies reviewed migration files using Supabase MCP tools (`apply_migration` or CLI).
- **Type Generation**: Authoritative TypeScript definitions are generated from the applied schema using Supabase CLI / MCP (`supabase gen types typescript`), outputting to `src/types/database.types.ts`.
- **Advisors & Audits**: Run `get_advisors` (or `supabase db advisors`) to verify RLS coverage and index health.
- **No Direct SQL User Fabrication**: The MCP MUST NOT be used to fabricate login users via direct SQL into `auth.users`. Supported Auth APIs or Studio must be used.
- **Zero Secrets in Code**: Service-role keys and access tokens are never committed to tracked files or client code. Only `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is exposed in browser code.
- **Development Tool Only**: The MCP server is purely an agent development/debugging tool; it is not part of the runtime web application architecture.

### 11. Testing Strategy
- **Unit / Domain Tests (`tests/unit/`)**:
  - `progress.test.ts`: Leaf 0/100, equal weights, custom relative weights (1 & 4), cancelled item exclusion, manual completion overrides, zero-weight safeguards.
  - `hierarchy.test.ts`: Arbitrary depth tree assembly, cycle prevention logic, descendant collection.
  - `calendar.test.ts`: Week calculation for all seven possible start weekdays, period date range formatting.
  - `reorder.test.ts`: Sibling integer sort ordering recalculations.
- **End-to-End Tests (`tests/e2e/`)**:
  - `auth.spec.ts`: Sign in, session persistence, sign out, root redirect to `/today`.
  - `today.spec.ts`: Quick Add title-only task, Anytime vs. Timed sections, leaf completion toggle.
  - `hierarchy.spec.ts`: Subtask creation, context inheritance (Area, Day date), expand/collapse.
  - `parent-completion.spec.ts`: 3-option completion prompt ("Complete parent only" vs "Complete parent and all descendants" vs "Cancel").
  - `reorder.spec.ts`: Sibling reorder persistence via mouse and keyboard.
  - `area-filter.spec.ts`: Single-Area filtering with contextual ancestor rows and filter clearing.
  - `settings.spec.ts`: First-day-of-week selection and Area CRUD (create, edit name/icon, delete).

---

## Dependencies & Justification

| Dependency | Purpose | Why Needed / Built-in Insufficient |
| :--- | :--- | :--- |
| `next`, `react`, `react-dom` | Web application framework & UI | Core platform stack; App Router provides native Server Components, Server Actions, and streaming. |
| `@supabase/ssr`, `@supabase/supabase-js` | Supabase Auth & Database client | Official Supabase integration for Next.js App Router cookie sessions and Postgres querying. |
| `@dnd-kit/core`, `@dnd-kit/sortable` | Same-list drag & drop reordering | Native HTML5 drag-and-drop lacks touch support on mobile and has poor keyboard accessibility; `@dnd-kit` provides pointer, touch, and keyboard sensors out of the box. |
| `@radix-ui/react-*` | Accessible UI primitives | Unstyled, fully accessible primitives for Dialog, Sheet, Checkbox, and DropdownMenu. |
| `lucide-react` | Icons | Clean, restrained productivity iconography matching `DESIGN.md`. |
| `tailwindcss` | Utility CSS styling | Fast, zero-runtime styling configured with `DESIGN.md` "Calm Utility" color palette. |
| `vitest` | Unit testing runner | Instant, zero-config TypeScript execution for pure domain functions. |
| `playwright` | E2E testing framework | Cross-browser desktop and mobile viewport testing of real user journeys. |

---

## Anti-Overengineering Self-Review

Before finalizing this plan, each subsystem was audited against the anti-overengineering checklist:

1. **Repository / Service Pattern**: **REJECTED**. Data access uses direct Supabase client calls inside Server Actions and Server Components. No repository interfaces, service classes, or dependency injection containers.
2. **State Management Libraries (Redux, Zustand, MobX)**: **REJECTED**. URL state handles views and filters; React state handles ephemeral tree expansion; Server Actions handle persistence.
3. **ORM (Prisma / Drizzle)**: **REJECTED**. Supabase client provides direct Postgres querying and typed schemas without ORM overhead.
4. **Custom Backend Server / Microservices**: **REJECTED**. Next.js App Router Server Actions handle all backend operations.
5. **Realtime / WebSockets**: **REJECTED**. Single-user access does not require live multi-client broadcast sync.
6. **Optimistic Sync Engine / Complex Caching**: **REJECTED**. Standard Server Action mutation with `revalidatePath` delivers immediate, reliable updates without duplicate client cache machinery.
7. **Future Slices Machinery**: **REJECTED**. No tables or abstractions were created for recurrence, rollover, reminders, templates, bulk actions, or audit logs.
8. **Ordering Algorithms**: **REJECTED**. Sequential integer `sort_order` is used without LexoRank or fractional coordinates.
9. **Duplicate Persistence Models**: **REJECTED**. Authoritative database types are generated directly from the schema.
10. **MCP Runtime Leakage**: **REJECTED**. Supabase MCP is treated strictly as an agent development/debugging tool, not runtime application code.

---

## Slice 1 Boundaries & Deferred Work

The following capabilities are explicitly deferred to subsequent slices and are **strictly excluded** from Slice 1:
- Needs Attention view
- Move workflow (cross-period date moving)
- Auto-rollover
- Recurrence (daily, weekly, monthly)
- Reminders / browser push notifications
- Subtree duplication and date shifting
- Templates
- Bulk actions & paste-many children
- Assign-across-days
- Cross-period drag-and-drop
- Realtime live sync
- Offline-first architecture
- AI features & analytics
- Teams, collaboration, billing, and public registration

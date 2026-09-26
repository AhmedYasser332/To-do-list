# Technical Research & Architecture Decisions: Core Planner (Slice 1)

**Feature**: `specs/001-core-planner/spec.md`  
**Date**: 2026-09-26  
**Status**: Revised (Post-Review)  

---

## 1. Application Architecture & Routing

### Decision
Use **Next.js App Router** (React 19, TypeScript) with Server Components for authenticated data loading and Server Actions for data mutations.

### Route Map (Slice 1)
- `/` -> Redirects immediately to `/today` (unauthenticated sessions intercepted and routed to `/login`).
- `/(auth)/login` -> Minimal, clean owner Sign In page.
- `/(planner)/today` -> Default home screen (Anytime + Timed tasks + Week/Month/Year progress context).
- `/(planner)/inbox` -> Unscheduled quick-capture items.
- `/(planner)/week` -> Current/selected calendar week view with daily breakdown.
- `/(planner)/month` -> Current/selected calendar month view.
- `/(planner)/year` -> Current/selected calendar year view.
- `/(planner)/settings` -> Minimal settings and Area management surface:
  - First day of week selector (`monday`..`sunday`).
  - Areas management: list areas, create area, edit name/icon, delete area.
  - Linked directly from desktop sidebar and mobile `More` navigation.

### Alternatives Considered
- *Separate Admin / Settings Subsystem*: Overkill; a simple `/settings` page satisfies all preferences and Area CRUD requirements in one clean location.
- *Custom Backend API / Express*: Unnecessary operational layer for a single-user personal planner.

---

## 2. Authentication, Session Management & Security

### Decision
Use **Supabase Auth** with `@supabase/ssr` managing cookie-based SSR sessions, guarded by Next.js root `proxy.ts` (Next.js 16 convention running under standard Node.js runtime behavior) and `lib/supabase/proxy.ts`.

### Security Rules & Identity Verification
1. **Server-Side Verified Identity**:
   - For protecting pages/data and routine authorization checks, prefer `supabase.auth.getClaims()` and obtain the authenticated owner ID from the verified claims.
   - Use `supabase.auth.getUser()` only when a fresh user record from the Auth server is actually required.
   - Never trust `supabase.auth.getSession().user` as authorization evidence in server code.
   - Every protected Server Action must verify server-side identity and **MUST NOT** accept or trust a `user_id` passed from client code.
2. **Account Creation Disabled at Configuration Level**:
   - In production Supabase Auth configuration, "Allow new users to sign up" is disabled, and anonymous sign-ins remain disabled.
   - In local development (`supabase/config.toml`), Auth configuration explicitly disables public signup and email signup (`enable_signup = false`), while keeping sign-in enabled for the already provisioned owner.
3. **No Public Signup UI**: The application interface exposes exclusively a Sign In form at `/login`.
4. **Zero-Manual-Supabase Owner Provisioning**:
   - Normal development provisioning is automated via a standalone developer utility: `scripts/provision-owner.ts`.
   - The script uses the supported Supabase Auth Admin API (`auth.admin.createUser`) with `SUPABASE_SECRET_KEY`.
   - It is idempotent and safe to run repeatedly by detecting existing owner accounts.
   - It never manipulates `auth.users` or `auth.identities` with handcrafted SQL.
   - The same supported Auth Admin mechanism is used for automated E2E setup.
   - Supabase Studio/Dashboard is treated strictly as an emergency/manual fallback, not the primary workflow.
5. **No Callback Route Needed**: Standard email/password authentication using `signInWithPassword` does not require an OAuth/PKCE callback route; `/api/auth/callback` is omitted.
6. **Publishable & Secret Key Conventions**:
   - Browser-safe public client: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (along with `NEXT_PUBLIC_SUPABASE_URL`).
   - Server/test administration: `SUPABASE_SECRET_KEY` (strictly server-only, never committed to source control, never prefixed with `NEXT_PUBLIC_`, never bundled into browser code).
   - Avoid legacy `anon` and `service_role` terminology.

---

## 3. Data Loading & Tree Construction

### Decision
Fetch the authenticated owner's Items in **one user-scoped query**, assemble the hierarchical tree and compute recursive progress in memory via pure domain functions, and project that tree into the active horizon and Area filter views.

### Rationale
- **Hierarchy/Scheduling Independence**: Hierarchy and scheduling are strictly independent. A displayed item's descendants may be scheduled on a different date, week, or month, but those descendants must still contribute to that item's recursive progress and must be available when expanding its hierarchy.
- **Dataset Scale**: A single user's active planning dataset is small (<10,000 items, typically a few hundred active rows). A single indexed query (`where user_id = auth.uid()`) executes in a few milliseconds and transfers tens of kilobytes.
- **Simplicity & Determinism**: Completely eliminates the need for recursive database RPCs, recursive network request cascades, materialized progress tables, or client-side caching libraries.

### In-Memory Projection
```text
Supabase: SELECT * FROM items WHERE user_id = auth.uid() ORDER BY sort_order ASC
        │
        ▼
Pure Domain: buildTree(items) -> calculates recursive weighted progress on all nodes
        │
        ├──> Today View: filter nodes scheduled for today + root parents with today's items
        ├──> Week View: filter nodes scheduled for active week + daily breakdown
        ├──> Month / Year View: filter nodes scheduled for active month / year
        ├──> Inbox View: filter horizon = 'inbox'
        └──> Area Filter (?area=id): show matching items + visually de-emphasized ancestor rows
```

### User Preferences Initialization Rule
- Do not require manual database seeding or Auth triggers to create a row in `user_preferences`.
- If an authenticated owner has no preferences record, application logic defaults to `first_day_of_week = 'monday'`.
- The `/settings` page displays this effective default.
- Updating or saving the preference executes an `UPSERT` on `user_preferences(user_id)`.

---

## 4. In-List Reordering Interaction

### Decision
Use **`@dnd-kit/core`** and **`@dnd-kit/sortable`** to reorder siblings within the same parent or root list, persisting sequential integer `sort_order` values.

### Reordering Approach
- **Multi-Input Sensors**: `PointerSensor` (desktop mouse), `TouchSensor` (mobile touch handles with activation delay), and `KeyboardSensor` (accessible keyboard reordering).
- **Simple Integer Positions**: Sibling items use sequential integer `sort_order` (`0, 1, 2, ...`). When an item is moved from position $A$ to position $B$, the sibling array is spliced and updated indices are persisted via Server Action.
- **No Complex Rank Algorithms**: No fractional coordinates, LexoRank, gap ranking, rebalance algorithms, or ordering RPCs.
- **Strict Scope**: Reordering is restricted to siblings within the same parent/list. Cross-period dragging between dates or horizons is strictly disabled.

---

## 5. Supabase MCP Operational Workflow

### Decision
Leverage the official **Supabase MCP** server in ZCode as a development-time operational tool to safely manage migrations, inspect schemas, and verify advisor signals.

### MCP Operational Rules
1. **Repository as Source of Truth**: All schema changes must be authored as version-controlled migration files in `supabase/migrations/`. Ad-hoc schema mutations via `execute_sql` are prohibited for persistent changes.
2. **Migration Application**: Apply reviewed migration files using Supabase MCP tools (`apply_migration` or CLI).
3. **Type Generation**: Generate authoritative TypeScript definitions directly from the applied schema using Supabase CLI / MCP (`supabase gen types typescript`), outputting to `src/types/database.types.ts`.
4. **Advisors & Security Audits**: Run `get_advisors` (or `supabase db advisors`) to verify RLS coverage, index health, and security compliance after migration application.
5. **No Auth Bypass**: The MCP MUST NOT be used to fabricate login users via direct SQL into `auth.users`. Supported Auth APIs or Studio must be used for user provisioning.
6. **Development Tool Only**: The MCP server is purely an agent development/debugging tool; it is not part of the runtime web application architecture.

---

## 6. UI Components & Design System

### Decision
Use **Tailwind CSS** with **Radix UI primitives** (via shadcn/ui components) themed strictly according to `DESIGN.md` "Calm Utility" rules.

### Design Tokens
- Canvas: Warm off-white (`#FBFBF9`) in light mode; warm charcoal (`#191919`) in dark mode.
- Surfaces: Pure white (`#FFFFFF`) in light mode; elevated charcoal (`#222222`) in dark mode.
- Text: Warm charcoal primary (`#2D2D2D`), muted secondary (`#737373`).
- Accent: Desaturated steel blue / muted cobalt (`#3B6D9E`).
- Anti-Slop: Zero purple/blue AI gradients, no glowing borders, no excessive card wrapping.

### Required Primitives
- `Button`, `Input`, `Textarea`, `Checkbox`
- `Sheet` (desktop right-side drawer & mobile bottom sheet for Item details)
- `Dialog` (3-option parent completion resolution dialog and delete confirmation)
- `DropdownMenu` (item actions menu)

---

## 7. Testing Stack

### Decision
- **Unit / Domain Tests**: **Vitest** for pure TypeScript domain logic (`progress.ts`, `hierarchy.ts`, `calendar.ts`, `reorder.ts`).
- **End-to-End Tests**: **Playwright** for critical browser user journeys across desktop (1440x900) and mobile (390x844) viewports.

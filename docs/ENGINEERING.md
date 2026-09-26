# Personal Planner — Engineering Rules

## 1. Stack

Primary application stack:

- Next.js App Router
- TypeScript
- React
- Supabase
- PostgreSQL
- Supabase Auth
- shadcn/ui primitives where useful

Use current supported patterns rather than relying on stale model memory.

For version-sensitive Next.js, React, Supabase, PostgreSQL, or shadcn behavior, consult current documentation through Context7 before implementation.

## 2. Architectural Goal

Optimize for:

- simplicity
- correctness
- maintainability
- testability
- fast iteration

Do not implement enterprise architecture for a single-user personal planner.

YAGNI applies aggressively.

## 3. Domain Model

The central domain entity is `Item`.

Do not create separate core tables for Goal, Task, or Subtask without a future requirement that genuinely needs them.

Conceptual Item fields include:

- id
- user_id
- parent_id nullable
- title
- description nullable
- horizon
- period_start nullable
- period_end nullable
- optional time
- area_id nullable
- weight
- status
- sort_order
- auto_rollover
- recurrence
- reminder_at nullable
- completed_at nullable
- created_at
- updated_at

Exact schema details belong in feature planning and migrations.

## 4. Tree

`parent_id` defines hierarchy.

The tree supports arbitrary depth.

Code must not assume a fixed:

Year -> Month -> Week -> Day

nesting depth.

Hierarchy and scheduling are independent.

## 5. Progress

Progress logic is deterministic domain logic.

It MUST NOT be embedded inside React presentation components.

Leaf:

    incomplete = 0
    complete = 1

Parent:

    weighted average of direct relevant children

Cancelled children are excluded.

Manual parent completion may override displayed parent progress while descendants retain their true state.

Reopening the manually completed parent restores calculated progress.

Progress should initially be derived rather than stored as mutable duplicated state.

Only introduce caching/materialization later if measured performance requires it.

## 6. Weights

Default Item weight:

    1

Weights are relative positive values.

Invalid, negative, NaN, or otherwise unusable weights must be rejected or normalized according to an explicitly tested rule.

Do not require sibling weights to total 100.

## 7. Scheduling

Store explicit scheduling horizon and period information.

Do not infer all scheduling semantics from arbitrary date ranges.

Week calculation respects the user's configured first day of week.

Historical scheduled periods should remain stable even if the user later changes the week-start setting.

## 8. Moving

Moving an Item modifies scheduling.

It must not silently modify hierarchy.

Temporal mismatch between parent and child is allowed.

The application can surface that mismatch to the user.

## 9. Duplicate

Subtree duplication must be handled by isolated, testable application/domain logic.

Date shifting must be deterministic.

When shifting a subtree, descendant relative scheduling offsets must be preserved according to documented rules.

Completion state resets by default.

History must not be duplicated.

## 10. Recurrence

Recurring occurrences require independent completion history.

Avoid an implementation that simply mutates one historical Item forward forever.

Detailed recurrence storage is decided during the recurrence feature plan.

## 11. Rollover

Rollover modifies schedule only.

Rollover must never silently re-parent an Item.

Manual rollover and automatic rollover must share well-tested scheduling primitives where practical.

## 12. Business Logic Boundaries

The following should live outside React components:

- progress calculations
- weight calculations
- schedule shifting
- subtree date shifting
- rollover
- recurrence generation
- parent/child completion rules
- week boundary calculations

React components should consume domain/application behavior rather than reimplement it.

## 13. Supabase Security

Use Supabase Auth.

Even though this is a single-user product, database access must be protected.

Use Row Level Security where appropriate.

Do not rely on obscurity or a hidden URL to protect personal data.

Never expose service-role credentials to the browser.

## 14. Database Changes

All meaningful schema changes must be represented as migrations.

Do not manually alter production schema as an undocumented step.

Keep generated TypeScript database types synchronized with schema changes when the selected Supabase workflow supports it.

## 15. Realtime

Do not introduce Supabase Realtime in the MVP unless a concrete requirement proves it necessary.

Normal request/revalidation flows are preferred for simplicity.

## 16. Testing Strategy

Prioritize tests by risk.

### Unit tests

Strong coverage for:

- recursive progress
- weights
- parent completion behavior
- cancellation behavior
- date shifting
- subtree duplication
- rollover
- recurrence
- week boundaries

### Integration tests

Cover important database/domain flows such as:

- creating Item trees
- moving Items
- duplicating subtrees
- deleting/cancelling
- authenticated data isolation

### E2E tests

Critical user journeys include:

- authentication
- Quick Add
- create parent and children
- paste multiple children
- distribute children across days
- complete a child and observe ancestor progress
- move an overdue Item
- duplicate a planning structure
- reload and verify persistence
- desktop viewport
- mobile viewport

Do not create tests solely to inflate coverage numbers.

## 17. Performance

Do not prematurely optimize.

Avoid obvious N+1 query patterns.

Do not fetch entire planning histories when a bounded query is sufficient.

Measure before introducing complex caching.

## 18. Event History

A lightweight Item event history is allowed and recommended for important state transitions.

Possible events:

- moved
- duplicated
- completed
- reopened
- cancelled

Its initial purpose is traceability and UX context, not analytics.

## 19. Error Handling

User-facing failures should:

- preserve user input where practical
- explain what failed
- avoid silent data loss
- provide retry when meaningful

Domain functions should return/test explicit failure conditions rather than depending on vague UI assumptions.

## 20. Maintainability

Prefer small focused modules.

Avoid unnecessary repository/service/hook abstraction layers unless they solve a real problem.

Do not refactor unrelated code while implementing a feature.

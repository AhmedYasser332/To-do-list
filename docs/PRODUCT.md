# Personal Planner — Product Definition

## 1. Purpose

This is a personal planning application for one user.

Its purpose is to replace disconnected yearly, monthly, weekly, and daily planning tables with one connected planning tree.

The application should make planning and tracking easier than maintaining the plan manually.

The product must reduce planning overhead rather than creating more administrative work.

## 2. Core Mental Model

Everything is an `Item`.

There are no separate Goal, Task, Subtask, Project, or Objective entities in the core domain.

An Item can represent:

- a yearly goal
- a monthly goal
- a weekly task
- a daily task
- a subtask
- a deeply nested descendant
- an Inbox item

Items form an unlimited parent/child tree.

Example:

2026
└── Learn Physics
    └── September
        └── Finish Lectures
            ├── Lecture 1
            │   ├── Watch lecture
            │   ├── Take notes
            │   └── Solve sheet
            ├── Lecture 2
            └── Lecture 3

Tree depth is independent from scheduling depth.

A Day item can contain children.
Those children do not need a more granular date.
They inherit the parent's day unless explicitly rescheduled.

A child may optionally have a specific time.

## 3. Hierarchy vs Scheduling

Hierarchy answers:

> What is this Item part of?

Scheduling answers:

> When do I intend to do this Item?

These concepts MUST remain independent.

Changing an Item's date MUST NOT silently change its parent.

Changing an Item's parent MUST NOT silently change its date.

If a move creates a temporal mismatch between child and parent, the user must be offered a choice.

## 4. Horizons

An Item can have one of these planning horizons:

- Inbox
- Day
- Week
- Month
- Year

Inbox has no scheduled period.

Day, Week, Month, and Year have explicit periods.

Weeks are real calendar weeks.

The first day of the week is a user setting.

The application must not assume that every month contains exactly four weeks.

## 5. Home Screen

The default home screen is `Today`.

Today should immediately answer:

- What do I need to do today?
- What is already completed?
- What has a specific time?
- What is overdue or needs attention?
- How am I progressing this week, month, and year?

Today must prioritize doing work, not displaying analytics.

## 6. Progress

Leaf Items have binary progress:

- incomplete = 0%
- complete = 100%

Parent progress is calculated recursively from direct children.

Children use equal weight by default.

Default weight:

    1

Users can manually assign relative weights.

For example:

    Read chapter       weight 1
    Final project      weight 4

The final project therefore contributes four times as much progress.

Weights are relative.
They do not have to sum to 100.

Cancelled Items are excluded from parent progress calculations.

Progress must propagate upward through the parent chain.

Calendar membership alone must NOT determine goal progress.

## 7. Manual Parent Completion

Any Item may be completed directly, including an Item with children.

When completing a parent with descendants, ask:

- Complete parent only
- Complete parent and all descendants
- Cancel

If only the parent is completed:

- the parent displays 100%
- descendants preserve their true completion states
- the UI indicates that the parent was completed manually
- reopening the parent restores calculated child-based progress

## 8. Inbox

The Inbox is a frictionless quick-capture area.

Creating an Inbox Item should require only a title.

Later, the user can:

- schedule it
- assign an Area
- attach it to a parent
- leave it in Inbox

Capturing an idea must never require completing a large form.

## 9. Areas

Items may optionally belong to one Area.

Example Areas:

- Study
- Projects
- Fitness
- Personal
- Reading

Areas are intentionally simple.

An Area needs:

- name
- icon
- sort order

Do not introduce complex tagging in the MVP.

## 10. Scheduling and Time

Day Items may optionally have a time.

Items without a time appear under an `Anytime` section.

Timed Items appear chronologically.

Creating a child should intelligently inherit useful context such as:

- parent
- Area
- relevant period

The user should not repeatedly enter information the application already knows.

## 11. Move

Any Item can be moved using convenient targets:

- Tomorrow
- Next week
- Next month
- Next year
- Custom period

If moving an Item places it outside its parent's period, show options such as:

- Keep current parent
- Move to a suitable parent
- Choose another parent

Never silently restructure the planning tree.

## 12. Needs Attention

Expired active Items with auto-rollover disabled must not disappear.

They appear in a `Needs Attention` section.

Actions include:

- Complete
- Move
- Cancel
- Keep where it is

## 13. Auto-Rollover

Auto-rollover is an optional per-Item setting.

Default:

    OFF

When enabled and the Item remains incomplete after its period:

- Day -> next Day
- Week -> next Week
- Month -> next Month
- Year -> next Year

Auto-rollover changes scheduling only.

It must not silently change the parent.

## 14. Recurrence

MVP recurrence types:

- Daily
- Weekly
- Monthly

Recurring occurrences must retain independent completion history.

Do not implement recurrence as one Item whose date is endlessly mutated.

## 15. Duplicate

Duplicate is a first-class workflow and must be easy to access.

It should be available from common Item interactions, including appropriate menus and context actions.

Options:

- Duplicate Item only
- Duplicate Item with descendants
- Duplicate to another period

When duplicating to another period ask:

- Keep original dates
- Shift dates relative to target period

Default behavior:

- reset completion status
- preserve descriptions
- preserve Areas
- preserve hierarchy
- preserve weights
- preserve relevant scheduling structure
- do not copy event history

If dates are shifted, reminders should shift consistently.

## 16. Templates

Any useful Item subtree may be saved as a template.

MVP template actions:

- Save as template
- Create from template
- Rename
- Delete

Do not build a complex template-management system in the MVP.

## 17. Fast Child Creation

Inside any Item the user should be able to quickly add children.

When creating multiple similar children, the UI must support efficient workflows.

Important workflows include:

- rapid Enter-to-add-another
- pasting multiple newline-separated names to create multiple children
- bulk selection
- assigning multiple children across consecutive days

Example:

Paste:

Lecture 1
Lecture 2
Lecture 3
Lecture 4
Lecture 5
Lecture 6
Lecture 7

Then:

Assign across days starting Saturday.

The application creates the seven scheduled children efficiently.

## 18. Drag and Drop

MVP drag and drop supports ordering Items inside the same list/view.

Moving Items between scheduling periods should use explicit Move actions initially to reduce accidental scheduling changes and implementation complexity.

## 19. Quick Add

Quick Add must be available from anywhere.

It should infer context.

Examples:

- Quick Add from Today -> defaults to Today
- Quick Add inside a parent -> defaults to that parent
- Quick Add from Inbox -> creates Inbox Item

Advanced metadata must remain optional.

## 20. Reminders

An Item may have one optional reminder.

Reminder storage belongs in the core model.

Actual browser/PWA notification delivery may be implemented as a separate subsystem so notification complexity does not block the core planner.

## 21. Authentication

This is a single-user application.

Use Supabase Auth to protect personal data and allow access from multiple devices.

Do not build public signup, teams, organizations, invitations, billing, roles, or multi-tenant product functionality.

## 22. Device Support

Desktop and mobile are equally important.

The application must be responsive rather than treating either device class as secondary.

## 23. MVP Implementation Slices

### Slice 1 — Core Planner

- Supabase Auth
- application shell
- Areas
- Item CRUD
- unlimited hierarchy
- horizons
- Inbox
- Today
- basic Week / Month / Year views
- Quick Add
- completion
- weighted progress
- Item detail UI
- responsive layout

This slice must produce a genuinely usable planner.

### Slice 2 — Planning Speed

- Needs Attention
- Move
- Duplicate
- duplicate subtree
- relative date shifting
- paste-many children
- assign children across days
- bulk actions
- templates
- drag reorder
- keyboard shortcuts

### Slice 3 — Automation and Polish

- recurring Items
- per-Item auto-rollover
- reminders
- dark mode polish
- accessibility pass
- visual polish
- critical E2E suite

## 24. Explicit Non-Goals

Do NOT add unless a future specification explicitly requests them:

- teams
- collaboration
- social features
- billing
- public SaaS signup
- organizations
- workspaces
- AI assistant features
- chat
- analytics dashboards
- gamification
- complex tagging
- Pomodoro
- time tracking
- Realtime synchronization unless a real requirement appears
- offline-first architecture
- enterprise architecture

The product should remain small, fast, personal, and maintainable.

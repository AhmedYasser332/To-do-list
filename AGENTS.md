# AGENTS.md

## 1. Mission

Build a small, excellent personal planning application.

The application exists to reduce the user's planning overhead.

Prefer correctness, speed of use, simplicity, and maintainability over feature count or architectural sophistication.

## 2. Sources of Truth

Before significant work, consult the relevant authoritative files.

Product behavior:

    docs/PRODUCT.md

Visual and interaction design:

    DESIGN.md

Stable engineering/domain rules:

    docs/ENGINEERING.md

Non-negotiable principles:

    .specify/memory/constitution.md

Current feature intent:

    current Spec Kit spec.md

Current technical plan:

    current Spec Kit plan.md

Current execution work:

    current Spec Kit tasks.md

When documents appear to conflict:

1. Constitution MUST rules have highest authority.
2. The current feature spec controls feature requirements.
3. PRODUCT.md controls stable product behavior.
4. ENGINEERING.md controls stable technical/domain boundaries.
5. DESIGN.md controls visual/interaction language.
6. plan.md controls implementation choices for the current feature.
7. tasks.md controls execution order.

Do not silently resolve meaningful contradictions.
Surface them.

## 3. Development Process

Use GitHub Spec Kit as the primary feature-development lifecycle.

For meaningful features use:

    $speckit-specify
    $speckit-clarify
    $speckit-plan
    $speckit-checklist
    $speckit-tasks
    $speckit-analyze
    $speckit-implement
    $speckit-converge

The Constitution is established once per project and updated only intentionally.

Repeat:

    implement -> converge

until convergence reports that the implementation satisfies the artifacts.

Do not run competing PRD/spec/task-generation methodologies in parallel with Spec Kit.

In particular, do not automatically invoke:

- to-prd
- to-spec
- to-tickets
- superpowers:writing-plans
- superpowers:executing-plans

for a normal Spec Kit feature.

## 4. Skill Routing

Use skills intentionally.

### Product discovery / ambiguity

Use when a feature is not yet sufficiently understood:

- superpowers:brainstorming

Use when assumptions need aggressive challenge:

- grilling

Use documentation-backed challenge when technical claims require verification:

- grill-with-docs

### Domain implementation

For meaningful business/domain behavior:

- superpowers:test-driven-development

Write failing behavior tests before implementation where appropriate.

### Debugging

For bugs and unexpected behavior:

- superpowers:systematic-debugging

Do not guess-fix bugs.

Establish evidence and root cause first.

### Next.js / React

Use:

- vercel-react-best-practices

Especially for:

- Server vs Client Components
- App Router patterns
- rendering boundaries
- performance
- unnecessary client state
- re-render risk

### Supabase

Use:

- supabase
- supabase-postgres-best-practices

For:

- Auth
- schema
- SQL
- RLS
- indexes
- query design
- migrations

### UI implementation

Consult DESIGN.md first.

Then use relevant skills:

- frontend-design
- superdesign
- shadcn-ui

After substantial UI work use:

- stop-slopv3
- impeccable

The design skills must not override explicit DESIGN.md rules.

### Testing quality

After significant tests are written or changed use:

- test-guard

Tests must validate behavior, not merely implementation trivia.

### Code quality

Before completing substantial implementation use:

- clean-code-guard

Avoid unrelated refactors.

### Documentation quality

When documentation changes materially use:

- docs-guard

Documentation must describe the real current system.

### Verification

Before declaring a task, phase, or feature complete use:

- superpowers:verification-before-completion

Do not claim success without current evidence.

### Code review

For meaningful feature completion use:

- superpowers:requesting-code-review

When handling review feedback use:

- superpowers:receiving-code-review

### Perspective

Use:

- zoom-out

when local implementation choices appear to be increasing system complexity or losing sight of the product goal.

## 5. MCP Routing

### Context7

Context7 is the preferred source for current library/framework documentation.

Use it before making version-sensitive decisions involving:

- Next.js
- React
- Supabase
- PostgreSQL-related Supabase patterns
- shadcn/ui
- other important dependencies

Do not rely solely on model memory for APIs that may have changed.

### Playwright

Use Playwright for critical browser behavior and E2E verification.

High-value flows include:

- login
- Quick Add
- hierarchy expansion/collapse
- completion
- progress propagation
- moving Items
- duplicate flows
- bulk interactions
- responsive mobile behavior
- responsive desktop behavior
- drag ordering when implemented

Do not create expensive browser tests for trivial static rendering.

### node_repl

Use only when a quick JavaScript/automation experiment materially helps.

It is optional, not part of the normal workflow.

### Irrelevant MCPs

Do not use project-irrelevant MCPs such as Google Apps Script / Sheets management for this application unless future requirements explicitly need them.

## 6. YAGNI

This is a personal single-user product.

Do not introduce without an explicit requirement:

- organizations
- workspaces
- teams
- collaboration
- billing
- public signup
- role systems
- generic plugin frameworks
- microservices
- event buses
- complex Clean Architecture ceremony
- Realtime
- offline-first
- AI features
- generic abstraction layers

Prefer the simplest implementation that cleanly satisfies the spec and engineering rules.

## 7. UI Rules

DESIGN.md is mandatory reading before creating or materially changing UI.

Never default to generic AI dashboard aesthetics.

Do not use:

- purple-first palettes
- decorative gradients
- glassmorphism
- glowing borders
- giant card grids
- excessive pills
- excessive rounded corners
- needless animations

Optimize the interface for repeated daily use.

Reducing clicks and repeated data entry is a product requirement.

## 8. Domain Rules

Never encode critical business logic separately in multiple UI components.

Centralize and test:

- progress
- weights
- date shifts
- rollover
- recurrence
- subtree duplication
- parent completion behavior

Scheduling and hierarchy are independent concepts.

Never silently re-parent an Item because its date changed.

## 9. Database Rules

Use migrations.

Use safe Supabase patterns.

Use RLS where appropriate.

Never expose service-role credentials to browser code.

Never modify production schema manually without a migration.

## 10. Testing Rules

Use TDD for high-value domain rules.

Prefer:

- behavior tests
- boundary tests
- regression tests

Avoid:

- snapshot spam
- testing framework internals
- meaningless coverage inflation
- duplicative tests with no additional risk coverage

Critical behavior must have appropriate unit/integration/E2E evidence before completion.

## 11. Definition of Done

A feature is not complete merely because code was written.

Before completion verify as applicable:

- required behavior implemented
- relevant unit tests pass
- integration tests pass
- type checking passes
- linting passes
- build passes
- critical E2E flows pass
- responsive behavior checked
- DESIGN.md respected
- no obvious accessibility regressions
- documentation remains accurate
- no unrelated changes were introduced
- Spec Kit convergence reports no remaining implementation gaps

## 12. Behavior When Unsure

Do not invent product behavior when authoritative project documents already define it.

If an ambiguity materially affects user behavior, data integrity, architecture, or scope:

- stop
- identify the ambiguity
- consult the relevant source-of-truth document
- use Spec Kit clarification when working within a feature specification

For harmless implementation details, make the smallest reasonable choice consistent with existing patterns.

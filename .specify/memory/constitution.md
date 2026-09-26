# Personal Planner Constitution

## I. Personal-First Simplicity

This product MUST remain optimized for a single user's personal planning workflow unless an explicitly approved future specification changes the product scope.

The implementation MUST prefer the simplest architecture that satisfies current requirements.

YAGNI is a governing principle.

Teams, organizations, billing, public SaaS infrastructure, collaboration, AI features, and enterprise abstractions MUST NOT be introduced speculatively.

## II. Interaction Speed Is a Product Requirement

The application exists to reduce planning overhead.

Repeated workflows MUST minimize unnecessary clicks, repeated data entry, and modal interruption.

Where appropriate, the product SHOULD prefer:

- intelligent inheritance
- Quick Add
- inline editing
- duplication
- templates
- bulk actions
- keyboard interactions
- touch-friendly interactions
- Undo

Usability optimization is not optional cosmetic polish for core workflows.

## III. Deterministic and Isolated Domain Logic

Critical domain behavior MUST be deterministic, independently testable, and separated from presentation code.

This includes:

- progress calculations
- weights
- completion propagation
- scheduling shifts
- rollover
- recurrence
- subtree duplication
- week boundaries

React components MUST NOT become the authoritative implementation of these rules.

Hierarchy and scheduling MUST remain independent domain concepts.

## IV. Test Behavior, Not Ceremony

High-risk domain behavior MUST have meaningful automated tests.

Testing MUST prioritize user-visible behavior, invariants, boundaries, and regression risk.

The project MUST NOT generate test bloat solely to increase coverage metrics.

Critical domain changes SHOULD follow test-driven development where practical.

Critical user journeys MUST receive appropriate integration or E2E verification.

## V. Protect Personal Data and Schema Integrity

Personal planning data MUST be protected by authentication and appropriate database authorization.

Secrets and privileged credentials MUST NOT be exposed to client code.

Schema changes MUST be represented by reviewable migrations.

Undocumented manual production schema changes are prohibited.

Data integrity takes priority over implementation convenience.

## VI. Evidence Before Completion

Agents MUST NOT declare meaningful work complete without current verification evidence.

Completion requires the relevant subset of:

- tests
- type checking
- linting
- build validation
- browser/E2E verification
- responsive checks
- documentation consistency
- Spec Kit convergence

If verification fails, the work is not complete.

## VII. Design Restraint

The interface MUST follow the project's DESIGN.md.

The product MUST avoid generic AI-generated dashboard aesthetics.

Visual design MUST prioritize calm hierarchy, readability, interaction speed, accessibility, and long-term daily usability over decoration.

## VIII. Spec-Driven Feature Development

GitHub Spec Kit is the authoritative feature-development lifecycle.

Meaningful features SHOULD progress through specification, clarification, planning, task generation, analysis, implementation, and convergence as appropriate to their complexity.

Implementation MUST remain traceable to approved requirements.

Convergence findings MUST be resolved before a feature is considered complete.

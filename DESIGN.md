# Personal Planner — Design System

## 1. Design Direction

Design philosophy:

    Calm Utility

The interface should feel like a mature productivity tool rather than an AI-generated SaaS dashboard.

Reference DNA:

- Things: calm visual hierarchy and focus
- Todoist: speed of interaction and low-friction task entry
- Linear: precision, density when useful, keyboard-friendly power-user behavior

Use these as inspiration for interaction and hierarchy, not as pixel-for-pixel copies.

## 2. Anti-Slop Rules

The following are explicitly prohibited unless a future design requirement has a strong functional reason:

- purple-first visual identity
- purple/blue AI gradients
- decorative gradients
- glassmorphism
- glowing borders
- excessive shadows
- giant rounded cards for every section
- excessive `rounded-2xl`
- dashboard card soup
- random emojis as decoration
- decorative AI sparkle iconography
- unnecessary animation
- landing-page aesthetics inside the productivity interface
- excessive badges
- excessive visual chrome

Do not generate a stereotypical AI/SaaS dashboard.

## 3. Visual Character

Use:

- warm neutral backgrounds
- warm charcoal primary text
- subtle secondary text
- thin hairline separators
- restrained border radius
- minimal elevation
- one restrained primary accent
- semantic color only where it communicates meaning

Preferred primary accent direction:

    muted blue / steel blue / desaturated cobalt

Avoid neon blue and purple.

Areas may use restrained colors such as:

- Study: muted blue
- Fitness: muted green
- Projects: muted amber
- Personal: muted coral

Area color should usually appear as a small dot, icon, or subtle accent rather than a fully colored card.

## 4. Light Theme

Light mode should use:

- warm off-white application canvas
- near-white content surfaces
- charcoal text rather than pure black
- subtle warm-gray borders
- restrained blue accent

Avoid extreme contrast where unnecessary.

## 5. Dark Theme

Dark mode must not become:

- neon
- purple
- glowing
- translucent glass

Use:

- charcoal-black canvas
- subtly elevated neutral surfaces
- warm off-white text
- understated borders
- the same restrained accent family as light mode

Depth should come primarily from surface differences and borders, not glow.

## 6. Information Hierarchy

Do not wrap every section in a card.

Prefer:

- typography
- spacing
- indentation
- separators
- subtle background changes

to communicate hierarchy.

Tasks should look lightweight when collapsed.

Power and detail should appear progressively when expanded.

## 7. Desktop Navigation

Desktop uses a persistent left sidebar.

Primary navigation:

- Today
- Inbox
- Upcoming

Planning:

- Year
- Month
- Week

Areas appear below.

The center pane is the primary working surface.

An optional right-side detail drawer may show Item details.

The main task list must remain visually dominant.

## 8. Mobile Navigation

Do not shrink the desktop sidebar.

Use a mobile-native bottom navigation such as:

- Today
- Plan
- Inbox
- More

Provide a prominent Quick Add action.

Use bottom sheets or full-height mobile sheets for detailed editing when appropriate.

## 9. Today Screen

Today is the default home screen.

It should show:

- current date
- completion summary
- Anytime Items
- timed Items
- Needs Attention
- compact Week / Month / Year progress context

Do not turn Today into an analytics dashboard.

## 10. Item Presentation

Collapsed Items should be compact.

Example:

    ○ Finish Physics lectures        4/7
      Study · This week

Expanded parent:

    ▼ Finish Physics lectures        57%
        ✓ Lecture 1                  Sat
        ✓ Lecture 2                  Sun
        ○ Lecture 3                  Mon
        ○ Lecture 4                  Tue
        + Add subtask

Nested Items should communicate hierarchy mainly through indentation and disclosure controls.

Completed Items remain visible but visually de-emphasized.

## 11. Item Details

On desktop, prefer a right-side drawer.

On mobile, prefer a bottom sheet or appropriate mobile detail surface.

Potential fields:

- title
- description
- progress
- parent
- children
- horizon
- period
- Area
- weight
- optional time
- reminder
- recurrence
- auto-rollover

Actions:

- Complete
- Move
- Duplicate
- Save as template
- Cancel
- Delete

Avoid forcing navigation to a completely separate page for routine Item editing.

## 12. Progressive Disclosure

Routine creation must stay simple.

Quick Add should initially expose only what is necessary.

Example:

    What needs doing?
    [________________________]

    Today · Study       Time  Parent  More

Advanced settings should be available but not mandatory.

## 13. Interaction Speed

Repeated actions must be optimized.

Support where appropriate:

- inline creation
- Enter to create another Item
- keyboard shortcuts
- context menus
- desktop right-click
- mobile long-press
- bulk selection
- paste-many
- duplicate
- duplicate and edit
- templates
- inherited values
- Undo

Avoid modal-heavy flows.

## 14. Undo vs Confirmation

Prefer Undo for common reversible actions such as:

- Move
- Complete
- Cancel
- ordinary Delete

Use explicit confirmation for destructive/high-impact actions such as:

- deleting a large subtree
- completing a parent and every descendant
- destructive bulk operations

## 15. Duplicate UX

Duplicate must be easy to reach.

For subtree duplication provide:

    Duplicate
    ├── Item only
    ├── Item + descendants
    └── To another period

When targeting another period:

    Dates
    ○ Keep original dates
    ● Shift relative dates

    Completion
    ● Reset completion state
    ○ Keep completion state

Reset completion should be the normal default.

## 16. Accessibility

Use semantic HTML.

Interactive controls must be keyboard accessible.

Focus states must be visible.

Do not rely on color alone for state.

Maintain sufficient contrast.

Respect reduced-motion preferences.

Touch targets must be appropriate for mobile use.

## 17. Responsive Principle

Desktop and mobile are both first-class.

Responsive design must change interaction patterns when necessary rather than merely shrinking components.

## 18. Component Foundation

shadcn/ui may be used for primitives.

Do not allow default shadcn visual styling to become the product identity.

The project's design tokens and interaction rules override generic component-demo aesthetics.

# Feature Specification: Core Planner (Slice 1)

**Feature Branch**: `001-core-planner`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "Slice 1 — Core Planner: single-user Supabase authentication, responsive application shell for desktop and mobile, Areas, Item CRUD, unlimited parent/child Item hierarchy, explicit horizons (Inbox, Day, Week, Month, Year), Inbox, Today as default home screen, basic Week/Month/Year views, Quick Add, optional time for Day Items, Item completion, parent completion behavior, recursive weighted progress, cancelled Items excluded from progress, Item detail drawer/sheet, intelligent context inheritance when creating children, ordering Items within the same list, responsive desktop/mobile experience, appropriate empty/loading/error states."

## Clarifications

### Session 2026-09-26

- Q: How should the single owner account be provisioned for initial access given that public sign-up is explicitly prohibited? (FR-001) → A: Direct Supabase provisioning: the owner account is created via Supabase dashboard or seed script; the application UI provides only a Sign In screen and explicitly omits public registration or self-signup workflows.
- Q: In the basic Week, Month, and Year views, should each view list only items explicitly assigned to that horizon, or also aggregate lower-horizon items (such as Day tasks within the Week view)? (FR-038, FR-039, FR-040) → A: Primary horizon items with breakdown: views display items assigned directly to that horizon (e.g., weekly objectives in Week view) while also presenting scheduled lower-level items in appropriate breakdown sections (e.g., Day items partitioned by day within the Week view).
- Q: Should the optional time for Day Items be stored and interpreted as a floating local time of day (e.g., "14:30") or as a timezone-anchored UTC timestamp? (FR-011) → A: Floating local time: stored as a wall-clock time string (e.g., "HH:mm" such as "09:30") independent of timezones, always displaying and ordering by that exact wall-clock time.
- Q: When deleting an Item that has descendants, should the system cascade-delete the entire subtree after confirmation, or promote the direct children to the deleted Item's parent? (FR-046) → A: Cascade-delete subtree with confirmation: deleting a parent removes the parent and all its descendants at all depths after the user explicitly confirms the action and is informed of the affected descendant count.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fast Daily Execution and Frictionless Quick Capture (Priority: P1)

As a personal planner user, I want the application to open directly to my Today view and let me capture new items instantly with minimal clicks, so that I can see what I need to do right now and record new thoughts without friction.

**Why this priority**: Today is the central operating surface of the product. The tool must reduce planning overhead immediately by making daily execution fast and task capture effortless.

**Independent Test**: Can be tested by signing into the app, immediately viewing Today's anytime and timed sections, creating an item with only a title, checking off a daily item, and confirming the status updates instantly.

**Acceptance Scenarios**:

1. **Given** an authenticated user opens or reloads the application, **When** the application loads, **Then** it defaults to the `Today` screen showing today's date, an Anytime section, a chronological Timed section, and a compact context area showing relevant current Week, Month, and Year Items alongside each Item's own tree-calculated progress (without calculating synthetic calendar-period averages).
2. **Given** the user is on the `Today` screen, **When** the user triggers Quick Add and enters a title without extra metadata, **Then** an Item is created with the `Day` horizon scheduled for today, placed in the Anytime section.
3. **Given** the user creates or edits a Day Item on Today with a specific time (e.g., 09:30), **When** saved, **Then** the Item appears in chronological order in the Timed section.
4. **Given** the user is anywhere in the application, **When** the user accesses the `Inbox` and adds an Item by entering only a title, **Then** an Item with the `Inbox` horizon is created with no scheduled period.
5. **Given** an incomplete leaf Item on Today, **When** the user checks off the completion control, **Then** the Item status transitions to complete (100%), and its visual presentation is de-emphasized while remaining visible.
6. **Given** a completed Item, **When** the user toggles the completion control off, **Then** the Item status returns to incomplete (0%) and its normal visual styling is restored.

---

### User Story 2 - Single-User Authentication and Personal Workspace Security (Priority: P1)

As the sole owner of the planner, I want my planning data securely gated behind personal authentication so that only I can view or modify my plan across my desktop and mobile devices.

**Why this priority**: Without personal authentication and data isolation, personal planning data cannot be stored or accessed across devices safely.

**Independent Test**: Can be tested by signing in with valid credentials, verifying access to planner data, reloading to verify session persistence, signing out to verify access denial, and verifying that unauthenticated sessions cannot view or manipulate items.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor, **When** they navigate to any planner route, **Then** they are redirected to a clean, restrained sign-in screen.
2. **Given** a user enters valid owner credentials on the sign-in screen, **When** they submit the form, **Then** they are authenticated, redirected to the `Today` screen, and their private planning data is accessible.
3. **Given** an authenticated user, **When** they reload the browser or switch tabs, **Then** their authenticated session persists without requiring re-login.
4. **Given** an authenticated user, **When** they choose the sign-out action, **Then** their session is terminated and they are immediately returned to the sign-in screen.
5. **Given** invalid credentials submitted on sign-in, **When** authentication fails, **Then** an informative, calm error message is displayed and no protected data is revealed.

---

### User Story 3 - Unlimited Hierarchy and Context-Inheriting Child Creation (Priority: P2)

As a planner managing long-term goals and detailed projects, I want to create unlimited parent/child nesting levels where the parent relationship is established and children intelligently inherit relevant context (Area, and Day date when created under a Day parent), so that I can break down large objectives without re-entering redundant information while keeping hierarchy and scheduling independent.

**Why this priority**: A unified planning tree replaces fragmented planning tables. Fast child creation with intelligent context inheritance reduces friction for common parent-child workflows while preserving strict independence between hierarchy and scheduling.

**Independent Test**: Can be tested by creating an Item, adding a child under it, verifying parent association, verifying Area inheritance, verifying that a child created under a Day Item inherits that date without requiring a time, and verifying arbitrary nesting depth without forced scheduling constraints.

**Acceptance Scenarios**:

1. **Given** any existing Item in the tree, **When** the user clicks "Add Child" (or triggers inline child creation), **Then** a new Item is created with its parent set to that Item.
2. **Given** a parent Item associated with an Area (e.g., "Study"), **When** a child is created under this parent, **Then** the child automatically inherits the parent's Area unless explicitly altered.
3. **Given** a Day horizon Item (e.g., "September 26"), **When** a child is created under this Day Item, **Then** the child inherits the Day horizon and the parent's date without requiring a time.
4. **Given** an Item with nested children, **When** the user toggles the hierarchy disclosure indicator, **Then** the child subtree smoothly expands or collapses, maintaining compact presentation when collapsed.
5. **Given** an Item at an arbitrary nesting depth (e.g., 5 levels deep), **When** a new child is added, **Then** the tree supports the additional level without depth restrictions or visual clipping.
6. **Given** an Item list, **When** the user reorders an Item relative to its siblings in the same list/parent (via desktop drag-and-drop, mobile touch controls, or keyboard action), **Then** the new sort order persists immediately without altering scheduling or moving the Item across periods.

---

### User Story 4 - Recursive Weighted Progress Calculation (Priority: P2)

As a user tracking complex objectives, I want my parent items to reflect the true recursive progress of their children based on configurable relative weights, so that high-effort tasks contribute proportionally and progress propagates all the way up the tree.

**Why this priority**: Progress integrity is a core domain promise. Calculating deterministic progress recursively from children prevents misleading completion metrics and manual progress calculation.

**Independent Test**: Can be tested by creating a parent with children of weights 1 and 3, completing the weight 1 child (observing 25% progress), completing the weight 3 child (observing 100% progress), cancelling a child (observing recalculation ignoring the cancelled child), and verifying ancestor propagation.

**Acceptance Scenarios**:

1. **Given** a leaf Item (an Item with no children), **When** incomplete, **Then** its progress is 0%; **When** complete, **Then** its progress is 100%.
2. **Given** a parent Item with multiple active children all having default weight (1), **When** some children are completed, **Then** the parent progress equals `(completed children count / total active children count) * 100`.
3. **Given** a parent Item with two active children where Child A has weight 1 and Child B has weight 4, **When** Child A is completed and Child B is incomplete, **Then** parent progress is calculated as 20% `(1 / (1 + 4))`.
4. **Given** a parent with active and cancelled children, **When** parent progress is calculated, **Then** cancelled children are completely excluded from both the numerator and the denominator.
5. **Given** a multi-level tree (Grandparent -> Parent -> Child), **When** Child is completed, **Then** Parent's calculated progress updates, and Grandparent's progress immediately updates based on Parent's new progress.
6. **Given** an Item with children where all children are incomplete, **When** displayed, **Then** progress indicates 0%.

---

### User Story 5 - Direct Parent Completion with Descendant Resolution (Priority: P2)

As a user who has finished an objective or project early, I want to complete a parent item directly and choose whether to complete all its descendants or only the parent, so that my plan accurately reflects what happened without forcing me to click every subtask individually.

**Why this priority**: Parents often represent holistic goals or milestones that may be marked done as a unit. PRODUCT.md explicitly mandates this 3-option prompt to avoid accidental mass updates or inconsistent states.

**Independent Test**: Can be tested by marking a parent with uncompleted children as complete, selecting "Complete parent only" (verifying parent displays 100% with manual badge while children stay incomplete), and in another test selecting "Complete parent and all descendants" (verifying all descendants mark complete).

**Acceptance Scenarios**:

1. **Given** an Item with one or more descendants where at least one descendant is incomplete, **When** the user clicks the completion control on the parent, **Then** the application displays a confirmation prompt with three explicit choices:
   - "Complete parent only"
   - "Complete parent and all descendants"
   - "Cancel"
2. **Given** the prompt is shown, **When** the user selects "Cancel", **Then** the parent remains in its previous completion state and no descendant states are modified.
3. **Given** the prompt is shown, **When** the user selects "Complete parent only", **Then**:
   - The parent displays 100% completion.
   - The UI displays an indicator showing the parent was completed manually.
   - All descendants preserve their existing completion states.
4. **Given** a parent that was manually completed with incomplete descendants, **When** the user unchecks / reopens the parent, **Then** the parent returns to calculated progress derived from its children and the manual completion indicator is removed.
5. **Given** the prompt is shown, **When** the user selects "Complete parent and all descendants", **Then** the parent and all its descendants at every depth transition to completed (100%).

---

### User Story 6 - Categorization with Areas (Priority: P3)

As a user balancing different facets of my life, I want to organize my items into simple Areas (such as Study, Projects, Fitness, Personal) so that I can distinguish and filter responsibilities across the application.

**Why this priority**: Areas provide essential visual grouping and domain context without the overhead of multi-tag clutter.

**Independent Test**: Can be tested by creating an Area with a name, icon, and sort order, assigning it to an Item, verifying its subtle badge/icon in lists, and filtering or inspecting items by Area.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** navigating to the Areas management in the sidebar/navigation, **Then** they can create a new Area by specifying a name, an icon, and an optional sort order.
2. **Given** existing Areas, **When** viewing an Item in list views or in the Item detail drawer, **Then** the assigned Area is displayed using a restrained accent indicator (dot or icon), avoiding loud, fully colored cards.
3. **Given** an Item without an Area, **When** the user assigns an Area in the detail surface or during creation, **Then** the Item updates immediately with that Area.
4. **Given** an Area is modified (name or icon updated), **When** saved, **Then** all Items associated with that Area display the updated details without data corruption.
5. **Given** an authenticated user on any major planning view (Today, Week, Month, Year), **When** the user selects an Area filter, **Then**:
   - All Items assigned to that Area are visible as matches.
   - Any non-matching ancestor Items required to understand a matching descendant's position in the planning tree remain visible as visually de-emphasized contextual ancestor rows (and are not treated or counted as Area matches).
   - Unrelated branches containing no matching descendants are hidden.
   - Filtering does not mutate Item Area assignments, parent/child relationships, scheduling, or stored hierarchy.
   - Clearing the filter immediately restores all Items.

---

### User Story 7 - Planning Horizons Navigation (Day, Week, Month, Year) (Priority: P3)

As a user planning across multiple timeframes, I want dedicated views for Day, Week, Month, and Year so that I can focus on my schedule at whichever planning altitude is relevant.

**Why this priority**: Connecting the daily schedule to weekly, monthly, and yearly horizons is the core purpose of the planning tree.

**Independent Test**: Can be tested by navigating between Today, Week, Month, and Year views, observing the correct items filtered by the active period, navigating between consecutive periods (e.g., this week vs. next week), and verifying that the user's first-day-of-week preference is respected.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** selecting `Week` view, **Then** the application displays items scheduled for the current calendar week, partitioned according to the user's configured first day of week (any of the seven weekdays: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday, defaulting to Monday).
2. **Given** an authenticated user, **When** selecting `Month` view, **Then** the application displays items scheduled for the current calendar month.
3. **Given** an authenticated user, **When** selecting `Year` view, **Then** the application displays items scheduled for the current calendar year.
4. **Given** any horizon view, **When** the user uses period navigation controls (previous/next period), **Then** the view transitions to the selected period and displays matching items.
5. **Given** an Item with a Day horizon scheduled for today, **When** viewed on the Today screen, **Then** it appears under Today; **When** viewed in the current Week view, **Then** it is visible within that week's context.
6. **Given** an authenticated user in Week, Month, or Year view, **When** the user triggers Quick Add, **Then** an Item is created matching the active horizon and currently viewed period (e.g., Week Item for the viewed week, Month Item for the viewed month, Year Item for the viewed year).

---

### User Story 8 - Responsive Shell, Item Details, and Quality States (Priority: P3)

As a user operating on desktop and mobile, I want a responsive application shell adhering to "Calm Utility" design rules with a detail drawer/sheet, clear loading states, empty states, and non-destructive error handling so that the tool feels dependable on any screen size.

**Why this priority**: Desktop and mobile are equal first-class targets. A mature productivity tool requires clear error recovery, calm typography, and low-friction detail editing.

**Independent Test**: Can be tested by resizing the viewport from desktop (left sidebar, center list, right drawer) to mobile (bottom navigation bar, full/bottom sheet for details), editing item fields, and simulating network interruptions.

**Acceptance Scenarios**:

1. **Given** a desktop viewport (width >= 1024px), **When** the user opens the application, **Then** a persistent left navigation sidebar is visible, the center pane displays the active list, and opening an Item slides in a right-side detail drawer without leaving the page.
2. **Given** a mobile viewport (width < 768px), **When** the user opens the application, **Then** a bottom navigation bar is visible (Today, Plan, Inbox, More), Quick Add is prominent, and opening an Item presents a native-feeling bottom sheet or full-height mobile sheet.
3. **Given** the Item detail drawer or sheet is open, **When** the user inspects the Item, **Then** they can view and edit: title, description, horizon, scheduled period, time (for Day items), Area, relative weight, completion status, parent, and direct children.
4. **Given** an empty list (e.g., empty Inbox or no tasks today), **When** the view loads, **Then** a calm, uncrowded empty state is displayed with a simple prompt to add an item.
5. **Given** an asynchronous operation in flight, **When** data is loading, **Then** subtle skeleton or understated loading indicators appear without flashing layout shifts.
6. **Given** a server error or failed operation, **When** the failure occurs, **Then** a calm message explains what failed, user input is preserved where applicable, and a retry action is offered.

---

### Edge Cases

1. **Circular Hierarchy Prevention**:
   - What happens when a user attempts to set an Item's parent to itself or to one of its own descendants?
   - The system MUST validate parent assignments and strictly prohibit circular parent/child loops, presenting an informative error message and keeping the current hierarchy intact.
2. **Deleted Parent Handling**:
   - What happens when a parent Item with children is deleted?
   - The application MUST prompt for confirmation detailing the count of affected descendants and, upon user confirmation, cascade-delete the parent and all its descendants at all depths. If cancelled, no items are deleted.
3. **Zero Weight Sibling Set**:
   - What happens if all active children of a parent have their weights set to 0 or invalid values?
   - The system MUST enforce that weights are positive numbers. If all active children have effective weight 0, the parent progress MUST safely evaluate to 0% without throwing division-by-zero or NaN errors.
4. **Temporal Mismatch Between Child and Parent**:
   - What happens when a parent is scheduled for a specific Month (e.g., September 2026) and a child Day Item is scheduled for a date in October 2026?
   - As established in PRODUCT.md, hierarchy and scheduling are strictly independent. The mismatch is permitted without silently changing either the parent or the child's date. The UI indicates the parent relationship without mutating schedules.
5. **Item Without Scheduled Period in Calendar Views**:
   - What happens to an Inbox Item or an unscheduled child when viewed in calendar horizon views (Day/Week/Month/Year)?
   - Items with the `Inbox` horizon or items with no scheduled period appear exclusively in the Inbox or within their parent's expanded hierarchy, never appearing in date-specific calendar lists where they have no scheduled membership.
6. **Extreme Tree Depth**:
   - What happens when a hierarchy reaches 10+ levels of nesting?
   - Presentation indentation must remain legible with horizontal scroll or indented branch disclosure without breaking layout borders or clipping action buttons.
7. **Single-User Access Boundary**:
   - What happens if an unauthenticated user or an unauthorized session attempts to access data endpoints directly?
   - All data operations MUST be denied, returning unauthorized responses, and the client must redirect to sign-in.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & Authorization
- **FR-001**: System MUST provide single-user authentication using email and password via Supabase Auth. The owner account is provisioned directly in Supabase or via seed script; the application interface MUST provide only a Sign In screen and MUST NOT expose public registration or sign-up workflows.
- **FR-002**: System MUST protect all planning routes and data access behind active authenticated sessions.
- **FR-003**: System MUST provide a sign-out mechanism that invalidates the local session and redirects to the sign-in view.
- **FR-004**: System MUST maintain user session state across browser reloads.

#### Core Entity & Hierarchy Model
- **FR-005**: System MUST treat every planning unit as an `Item` entity in the core domain, without distinct domain entities for Goal, Project, Task, or Subtask.
- **FR-006**: System MUST support an unlimited parent/child hierarchy where any Item can have zero or one `parent_id` and zero or many children.
- **FR-007**: System MUST strictly reject circular parent references (an Item cannot be its own ancestor).
- **FR-008**: System MUST maintain hierarchy (`parent_id`) and scheduling (`horizon`, `period_start`, `period_end`) as strictly independent properties. Changing an Item's schedule MUST NOT alter its parent, and changing its parent MUST NOT alter its schedule.

#### Horizons & Scheduling
- **FR-009**: System MUST support five explicit horizons: `Inbox`, `Day`, `Week`, `Month`, and `Year`.
- **FR-010**: Items with the `Inbox` horizon MUST have no scheduled period.
- **FR-011**: Items with the `Day` horizon MUST have a specific calendar date and MAY optionally have a specific time of day stored as a floating wall-clock time string (e.g., "09:30") independent of timezones.
- **FR-012**: Items with the `Week` horizon MUST correspond to a specific calendar week, calculated using the user's configured first day of the week.
- **FR-013**: Items with the `Month` horizon MUST correspond to a specific calendar month.
- **FR-014**: Items with the `Year` horizon MUST correspond to a specific calendar year.
- **FR-015**: System MUST support a user setting for the first day of the week, allowing selection of any of the seven weekdays (`monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`), defaulting to `monday`. Week period calculation and Week view partitioning MUST respect this setting. Historical stored scheduling periods MUST NOT be silently rewritten merely because this preference is changed.
- **FR-016**: Day items without an explicit time MUST appear in an `Anytime` grouping on the Day/Today view; Day items with an explicit time MUST appear in chronological order in a `Timed` grouping.

#### Context Inheritance & Quick Add
- **FR-017**: System MUST provide a frictionless Quick Add input accessible from any view that requires only a title to create an Item.
- **FR-018**: Quick Add MUST infer context based on the active view or parent context, requiring only a title for the basic creation flow:
  - From `Today` view: creates an Item with the `Day` horizon scheduled for today (placed in the Anytime grouping unless a time is specified).
  - From `Inbox` view: creates an Item with the `Inbox` horizon and no scheduled period.
  - From `Week` view: creates an Item with the `Week` horizon scheduled for the currently selected calendar week.
  - From `Month` view: creates an Item with the `Month` horizon scheduled for the currently selected calendar month.
  - From `Year` view: creates an Item with the `Year` horizon scheduled for the currently selected calendar year.
  - When invoked inside an existing Item: creates a child of that Item, establishing the parent relationship and preserving the established context-inheritance rules.
- **FR-019**: Creating a child Item under a parent MUST automatically inherit the parent's Area (if set).
- **FR-020**: Creating a child Item under a `Day` parent MUST automatically inherit the parent's scheduled date without requiring a time.

#### Item Completion & Recursive Progress
- **FR-021**: Leaf Items (Items with no active children) MUST evaluate completion as binary: incomplete = 0%, completed = 100%.
- **FR-022**: Parent progress MUST be calculated recursively from its direct active children as a weighted average.
- **FR-023**: Children MUST default to a relative weight of `1`.
- **FR-024**: Users MUST be able to assign a custom relative positive weight (positive number) to any Item. Weights do not have to sum to 100.
- **FR-025**: Cancelled Items MUST be excluded from parent progress calculations (omitted from both completed and total weight).
- **FR-026**: Progress MUST propagate deterministically upward through every ancestor in the parent chain.
- **FR-027**: When completing a parent that has descendants, the system MUST prompt the user with three options:
  1. Complete parent only
  2. Complete parent and all descendants
  3. Cancel
- **FR-028**: If "Complete parent only" is chosen:
  - The parent status becomes complete and displays 100% progress.
  - Descendants retain their existing completion states.
  - The UI displays an indicator showing manual parent completion.
  - Reopening the parent restores its calculated progress derived from children.
- **FR-029**: If "Complete parent and all descendants" is chosen, the parent and all its descendant Items at all depths MUST be marked complete.

#### Areas
- **FR-030**: System MUST support creating, viewing, updating, and deleting `Area` entities.
- **FR-031**: Each Area MUST have a name, an icon, and a sort order.
- **FR-032**: An Item MAY optionally belong to at most one Area.
- **FR-033**: Areas MUST be displayed with subtle visual cues (restrained dot or icon) adhering to DESIGN.md, avoiding fully saturated cards.
- **FR-034**: System MUST allow the user to filter major planning views (`Today`, `Week`, `Month`, `Year`) by a single selected Area:
  - All Items explicitly assigned to the selected Area MUST be visible as active matches.
  - Any non-matching ancestor Items required to preserve tree position context for matching descendants MAY remain visible as visually de-emphasized contextual ancestor rows (and MUST NOT be treated or counted as Area matches).
  - Unrelated branches containing no matching descendants MUST be hidden.
  - Filtering MUST NOT modify Item Area assignments, parent/child relationships, scheduling, or stored hierarchy.
  - The UI MUST provide a prominent, simple control to clear the active Area filter and return to viewing all Areas without multi-tag or complex saved filter overhead.

#### Views & Navigation
- **FR-035**: System MUST designate `Today` as the default home screen upon launch.
- **FR-036**: Today screen MUST display the current date, completion summary, Anytime Items, timed Items, and a compact context area displaying relevant current Week, Month, and Year Items along with each Item's own recursively calculated progress. Progress MUST remain exclusively Item/tree based; the system MUST NOT calculate synthetic calendar-wide progress metrics (such as a generic "September progress" or "2026 progress" averaged across all calendar items).
- **FR-037**: System MUST provide an `Inbox` view listing all unscheduled Inbox Items.
- **FR-038**: System MUST provide a `Week` view displaying Items directly scheduled for the selected week alongside a day-by-day breakdown of Day Items scheduled within that week.
- **FR-039**: System MUST provide a `Month` view displaying Items directly scheduled for the selected month alongside visibility into its constituent weeks/days.
- **FR-040**: System MUST provide a `Year` view displaying Items directly scheduled for the selected year alongside month breakdown progress context.
- **FR-041**: Users MUST be able to navigate to preceding and succeeding periods in Week, Month, and Year views.
- **FR-042**: Users MUST be able to expand and collapse subtrees of any parent Item in list views.
- **FR-043**: Users MUST be able to manually reorder Items within the same list/parent:
  - Desktop viewports MUST support drag-and-drop reordering within the same list/parent.
  - Mobile viewports MUST provide a touch-friendly reordering interaction (such as touch handles or reorder mode).
  - Keyboard and accessibility users MUST have an equivalent usable mechanism to adjust an Item's position among siblings.
  - Reordered positions MUST persist.
  - Cross-period drag-and-drop between dates, horizons, or scheduling buckets remains strictly OUT OF SCOPE for Slice 1 and MUST NOT be used to modify scheduling.

#### Item Detail & Editing
- **FR-044**: On desktop viewports, opening an Item MUST display a non-modal right-side drawer showing all Item fields and actions.
- **FR-045**: On mobile viewports, opening an Item MUST display a bottom sheet or full-height mobile sheet.
- **FR-046**: The detail surface MUST support editing title, description, horizon, scheduled period, time, Area, relative weight, completion status, and deleting the Item (with subtree cascade deletion upon explicit user confirmation displaying the affected descendant count).
- **FR-047**: System MUST support marking an Item as Cancelled without deleting it.

#### User Experience & Design Compliance
- **FR-048**: System UI MUST strictly follow `DESIGN.md` "Calm Utility" principles: warm neutral backgrounds, warm charcoal text, subtle borders, muted steel blue primary accent, no AI gradients, no glowing borders, no excessive card wrapping.
- **FR-049**: System MUST provide clear, restrained empty states when lists contain no Items.
- **FR-050**: System MUST provide non-jarring loading states (subtle skeletons or quiet indicators) during asynchronous data fetching.
- **FR-051**: System MUST display actionable, non-destructive error feedback when an action fails, preserving any unsubmitted user input.

---

### Key Entities *(include if feature involves data)*

- **Item**:
  - `id`: Unique identifier.
  - `user_id`: Identifier of the owning user.
  - `parent_id`: Optional identifier of the parent Item (null for root items).
  - `title`: Short descriptive text of the planning unit.
  - `description`: Optional extended notes or details.
  - `horizon`: Planning scope (`Inbox`, `Day`, `Week`, `Month`, `Year`).
  - `period_start`: Start timestamp/date of the scheduled period (null for Inbox).
  - `period_end`: End timestamp/date of the scheduled period (null for Inbox).
  - `time`: Optional specific floating wall-clock time string for Day items (e.g., `09:30`).
  - `area_id`: Optional reference to an Area.
  - `weight`: Positive relative weight for progress calculation (default: 1).
  - `status`: Completion state (`incomplete`, `complete`, `cancelled`).
  - `is_manually_completed`: Boolean flag indicating whether a parent with children was manually completed.
  - `sort_order`: Numeric ordering position among siblings in the same view.
  - `completed_at`: Timestamp when the item was marked completed (null if incomplete).
  - `created_at`: Creation timestamp.
  - `updated_at`: Last modification timestamp.

- **Area**:
  - `id`: Unique identifier.
  - `user_id`: Identifier of the owning user.
  - `name`: Name of the area (e.g., "Study", "Personal", "Projects").
  - `icon`: Identifier of the icon representing the area.
  - `color_token`: Optional restrained semantic color token (e.g., muted blue, muted green).
  - `sort_order`: Numeric ordering position among areas.
  - `created_at`: Creation timestamp.
  - `updated_at`: Last modification timestamp.

- **User Preferences**:
  - `user_id`: Identifier of the owning user.
  - `first_day_of_week`: User choice for calendar week calculation (any of the seven weekdays: `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`; default: `monday`).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can capture a new thought into the Inbox or Today in under 3 seconds from opening the application.
- **SC-002**: When an Item is completed or reopened, affected ancestor progress updates automatically and feels immediate under normal use, updating the visible tree without requiring a manual page reload or full refresh.
- **SC-003**: 100% of recursive progress calculations match the deterministic weighted formula, with zero division-by-zero errors when children are cancelled or weight configurations are modified.
- **SC-004**: When completing a parent with active children, the 3-option resolution prompt appears 100% of the time, and choosing "Complete parent only" preserves 100% of child completion states without data loss.
- **SC-005**: All core planning interactions (creating items, expanding hierarchy, checking completion, editing details) are fully functional on both desktop viewports (1440x900, 1920x1080) and mobile viewports (375x667, 390x844).
- **SC-006**: An unauthenticated user can never access or view any planning data under any scenario.
- **SC-007**: 100% of user-visible screens comply with `DESIGN.md` anti-slop rules: zero purple/blue AI gradients, zero glowing borders, zero generic card-soup layouts.

---

## Assumptions

1. **Single-User Scope**: The application is configured for a single owner using personal credentials; no invitations, organizations, multi-tenant roles, or team sharing exist in this slice.
2. **First-Day-of-Week Default**: Unless explicitly configured in user settings, weeks start on Monday (ISO standard).
3. **Connectivity**: The application operates with standard web client connectivity to its database backend; offline-first synchronization is explicitly out of scope for Slice 1.
4. **Drag-and-Drop Scope**: Reordering is supported within the same list/parent in this slice; cross-period drag-and-drop between days/weeks/months is deferred to future slices.
5. **Item Title**: An Item requires only a non-empty title string to be valid; all other attributes have defaults or are optional.

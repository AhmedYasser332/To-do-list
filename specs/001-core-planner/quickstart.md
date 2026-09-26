# Quickstart & Verification Guide: Core Planner (Slice 1)

**Feature**: `specs/001-core-planner/spec.md`  
**Date**: 2026-09-26  
**Status**: Revised (Post-Review)  

---

## 1. Prerequisites & Environment Setup

### Required Tools
- Node.js 20+ (LTS)
- npm or pnpm
- Supabase CLI installed locally or a linked Supabase project

### Local Environment Variables (`.env.local`)
Follow current Supabase documentation using the publishable key convention:
```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_pub_...
```
*(For automated test scripts running server-side only, `SUPABASE_SERVICE_ROLE_KEY` may be configured locally; it must never be prefixed with `NEXT_PUBLIC_` or exposed to browser code).*

### Owner Account Provisioning
1. **Local Development (Studio / Dashboard)**:
   - Open Supabase Studio (e.g., `http://127.0.0.1:54323`).
   - Navigate to **Authentication > Users** and click **Add User**.
   - Create owner: `owner@example.com` with password `password123`.
   - In **Authentication > Configuration**, ensure **Allow new users to sign up** is disabled.
2. **Automated E2E Test Setup**:
   - Automated test fixtures provision the owner using the official Supabase Auth Admin API in a test helper:
     ```typescript
     import { createClient } from '@supabase/supabase-js';
     const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
     await admin.auth.admin.createUser({
       email: 'owner@example.com',
       password: 'password123',
       email_confirm: true,
     });
     ```
   - Direct SQL insertion into `auth.users` is strictly prohibited.

---

## 2. Automated Test Execution

### 2.1 Unit & Domain Tests (Vitest)
Executes pure domain unit tests covering recursive weighted progress, hierarchy cycle prevention, context inheritance, and weekday boundary logic:
```bash
npm run test:unit
```
**Expected Outcome**: 100% of unit tests pass, confirming deterministic domain logic runs completely isolated from UI and database.

### 2.2 End-to-End User Journey Tests (Playwright)
Executes critical browser tests across desktop and mobile viewports:
```bash
npx playwright test
```
**Expected Outcome**: All core journey specs pass, including sign-in gating, root redirection, Today quick-add, hierarchy expansion, 3-option parent completion prompt, in-list reordering, Area filtering, and Settings preferences.

---

## 3. Manual Validation Scenarios

### Scenario 1: Authentication Gate & Root Redirection
1. Open a clean private/incognito browser window and navigate to `http://localhost:3000/`.
2. **Verify**: The application intercepts the unauthenticated session and redirects to `/login`. No planner data or protected shell is visible.
3. Submit invalid credentials (`wrong@example.com` / `badpass`).
4. **Verify**: A calm error message appears; no unhandled crash occurs.
5. Enter valid owner credentials (`owner@example.com` / `password123`) and submit.
6. **Verify**: Successfully redirected to `/today`.
7. Navigate to `http://localhost:3000/`.
8. **Verify**: Automatically redirects authenticated session to `/today`.

### Scenario 2: Today View & Frictionless Quick Add
1. On `/today`, locate the Quick Add input field.
2. Type `"Review research notes"` and press `Enter`.
3. **Verify**: Item appears immediately in the `Anytime` grouping with 0% completion.
4. Click the item to open the right-side detail drawer (desktop) or bottom sheet (mobile).
5. Add a time: `10:00`. Save.
6. **Verify**: Item moves into the chronological `Timed` section under 10:00 AM.
7. Click the completion circle.
8. **Verify**: Item transitions to 100% complete, styling becomes subtly de-emphasized. Uncheck to verify it toggles back to 0%.

### Scenario 3: Hierarchical Tree & Intelligent Context Inheritance
1. Navigate to `/week`. Use Quick Add to create a weekly outcome `"Launch project alpha"`.
2. Click `"Add Child"` on `"Launch project alpha"`.
3. In the child creation input, enter `"Draft architecture"` and assign Area `"Projects"`.
4. Create a child under `"Draft architecture"`.
5. **Verify**: The child automatically inherits Area `"Projects"`.
6. Expand and collapse the hierarchy tree using the chevron disclosure control.
7. **Verify**: Subtrees expand smoothly and maintain hierarchy without clipping.

### Scenario 4: Recursive Weighted Progress & Parent Completion
1. Under a parent item, create two child tasks:
   - Child A: weight `1`
   - Child B: weight `3`
2. Complete Child A.
3. **Verify**: Parent progress dynamically updates to `25%` (1 / 4).
4. Click the parent completion circle directly.
5. **Verify**: A dialog appears with three choices:
   - "Complete parent only"
   - "Complete parent and all descendants"
   - "Cancel"
6. Click "Complete parent only".
7. **Verify**: Parent displays 100% completion with a "Completed manually" badge. Child B remains incomplete.
8. Uncheck the parent.
9. **Verify**: Parent reverts to 25% calculated progress; manual badge disappears.
10. Click the parent completion circle again and choose "Complete parent and all descendants".
11. **Verify**: Parent and all descendants display 100% complete.

### Scenario 5: Same-List Reordering Interaction
1. In a list of three sibling items, drag Item 3 above Item 1 (desktop mouse drag or mobile touch handle).
2. For keyboard: focus the reorder handle, press space/enter, move with arrow keys, and press space/enter to drop.
3. **Verify**: Item 3 stays in the new position with updated integer sort order. Reload the page; verify the new sort order persists.
4. **Verify**: No dates or horizons were modified.

### Scenario 6: Single-Area Filtering with Preserved Hierarchy Context
1. Navigate to `/today` (with tasks in "Study", "Personal", and unassigned).
2. Select Area `"Study"` in the sidebar or navigation bar.
3. **Verify**: Only "Study" items and their necessary ancestor context rows appear. Unrelated "Personal" branches disappear.
4. Click `"Clear Filter"`.
5. **Verify**: All items reappear in their correct original structure.

### Scenario 7: Settings Surface (Preferences & Area Management)
1. Click **Settings** in the desktop sidebar (or mobile `More` menu).
2. Under **Planning Preferences**, change the **First day of week** from Monday to Sunday.
3. Navigate to `/week`.
4. **Verify**: The week calendar partition now starts on Sunday instead of Monday, while historical item dates remain unaltered.
5. Return to `/settings`. Under **Areas**:
   - Create a new Area: Name `"Health"`, Icon `"heart"`.
   - Edit the newly created Area name to `"Wellness"`.
   - Delete the Area.
6. **Verify**: Area CRUD functions seamlessly without errors or page crashes.

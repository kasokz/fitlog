# S05: Deload Auto-Adjustment

**Goal:** When a mesocycle is in its deload week and the user starts a workout, pre-filled set weights are automatically reduced to ~60% and volume capped at 3 sets per exercise, with a deload indicator banner on the workout screen.
**Demo:** Start a workout from a program whose mesocycle `current_week == deload_week_number`. Observe pre-filled weights are ~60% of last session (rounded to 2.5kg) with max 3 working sets per exercise. The workout page shows a page-level deload banner indicating this is a deload session.

## Must-Haves

- Pre-fill hook in `handleStartWorkout()` detects deload week via `isDeloadWeek(mesocycle)` and transforms pre-filled sets via `calculateDeloadSets()`
- Deload transform applies to both branches: last-session pre-fill and first-time template defaults
- `DeloadBanner.svelte` component shows on workout page when session is in a deload week (page-level, above exercise cards)
- Banner displays deload context (week info) and is dismissible
- Deload detection for banner uses stored `mesocycle_week` + mesocycle's `deload_week_number` (stable across app resume)
- Graceful handling when mesocycle is null or deleted
- de.json base locale keys added for all new deload UI text

## Proof Level

- This slice proves: integration
- Real runtime required: no (tested via unit tests for pre-fill logic + manual dev verification for UI)
- Human/UAT required: yes (visual inspection of deload banner styling, weight reduction UX)

## Verification

- `pnpm test -- deloadIntegration` — integration test verifying pre-fill hook applies deload transform correctly for both last-session and first-time branches
- `pnpm run build` — build passes with zero errors (DeloadBanner component compiles, i18n keys resolve)
- Manual: Start workout from program with deload week active → weights are ~60%, max 3 sets, banner visible

## Observability / Diagnostics

- Runtime signals: `console.log('[Workout] Deload week detected, applying deload transform', { mesocycleId, currentWeek })` in the pre-fill path for debugging
- Inspection surfaces: Session's `mesocycle_week` in DB matches the mesocycle's `deload_week_number` — queryable to verify deload was triggered
- Failure visibility: If deload transform fails, the pre-fill falls through to normal weights (no crash) — logged as `console.error('[Workout] Deload transform failed', err)`
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed:
  - `calculateDeloadSets()`, `isDeloadWeek()` from `src/lib/services/analytics/deloadCalculator.ts`
  - `DeloadSet` type from `src/lib/types/analytics.ts`
  - `ProgramRepository.getMesocycleByProgramId()` from `src/lib/db/repositories/program.ts`
  - `WorkoutRepository.getLastSessionForDay()`, `addSet()` from `src/lib/db/repositories/workout.ts`
  - `ProgressionBanner.svelte` pattern from `src/lib/components/workout/`
- New wiring introduced in this slice:
  - Deload transform interposed between pre-fill fetch and `addSet()` loop in `handleStartWorkout()`
  - `DeloadBanner.svelte` rendered on workout page when session is deload week
  - Mesocycle lookup on workout page for deload detection
- What remains before the milestone is truly usable end-to-end:
  - S06 (freemium gate) and S07 (i18n en.json + full locale sync) still needed

## Tasks

- [x] **T01: Wire deload transform into session pre-fill and add integration test** `est:1h`
  - Why: The core behavior — when a mesocycle is in deload week, pre-filled sets must have reduced weight (~60%) and capped volume (max 3 sets). This is the pre-fill hook that makes R017 work at session-creation time.
  - Files: `apps/mobile/src/routes/programs/[id]/+page.svelte`, `apps/mobile/src/lib/services/analytics/__tests__/deloadIntegration.test.ts`
  - Do: In `handleStartWorkout()`, after fetching `lastSession` (or creating template defaults), check `mesocycle && isDeloadWeek(mesocycle)`. If true, collect the sets per exercise, run `calculateDeloadSets()` on each group, and use the `DeloadSet[]` output for `addSet()` calls instead of the originals. For the first-time template branch, apply the same transform to the generated default sets. Add integration test covering both branches (last-session deload and template-default deload), null mesocycle bypass, and deload-disabled bypass.
  - Verify: `pnpm test -- deloadIntegration` passes
  - Done when: Starting a workout from a deload-week mesocycle produces sets with ~60% weight and max 3 working sets per exercise, while non-deload weeks are unaffected.

- [x] **T02: Create DeloadBanner and integrate into workout page with i18n keys** `est:1h`
  - Why: Users need visual confirmation that they're in a deload week with reduced weights. The banner provides context and prevents confusion about why weights are lower. de.json keys must be added per AGENTS.md rules.
  - Files: `apps/mobile/src/lib/components/workout/DeloadBanner.svelte`, `apps/mobile/src/routes/workout/[sessionId]/+page.svelte`, `apps/mobile/messages/de.json`
  - Do: Create `DeloadBanner.svelte` following `ProgressionBanner.svelte` pattern (Alert + icon + dismiss). Use blue/amber color theme to distinguish from green progression banner. Show deload week number and brief explanation. On the workout page, after session load, if `session.mesocycle_id` is set, fetch the mesocycle via `ProgramRepository.getMesocycleByProgramId()` and compare `session.mesocycle_week === mesocycle.deload_week_number`. If true, show `DeloadBanner` above the exercise cards list. Handle null mesocycle_id and deleted mesocycle gracefully (skip banner). Add de.json keys for banner title, description, and dismiss label.
  - Verify: `pnpm run build` succeeds. Manual: workout page in deload week shows banner; non-deload sessions show no banner.
  - Done when: Deload banner renders above exercise cards for deload-week sessions, is dismissible, and doesn't appear for non-deload sessions. de.json keys exist.

## Files Likely Touched

- `apps/mobile/src/routes/programs/[id]/+page.svelte`
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte`
- `apps/mobile/src/lib/components/workout/DeloadBanner.svelte`
- `apps/mobile/src/lib/services/analytics/__tests__/deloadIntegration.test.ts`
- `apps/mobile/messages/de.json`

# S04: RIR Progression Suggestions in Workout

**Goal:** During an active workout, exercises with a progression suggestion (based on RIR trends from recent completed sessions) show a non-intrusive, dismissible banner suggesting a specific weight increase rounded to practical equipment increments.
**Demo:** Start a workout for a program day where at least one exercise has ≥2 completed sessions with avg RIR ≥2 across ≥3 working sets per session. A banner appears on that exercise's card showing "Erhöhe auf X kg (+Y kg)" with a dismiss button. Exercises without enough history show no banner. Dismissing the banner hides it for the current session.

## Must-Haves

- Progression suggestions load asynchronously after session data renders (never blocks workout UI)
- Banner appears inside ExerciseCard above sets, using shadcn Alert component with TrendingUp icon
- Banner text shows suggested weight and increment, equipment-aware (e.g., "+2.5 kg" for barbell, "+2 kg" for dumbbell)
- Banner is dismissible per-exercise for the current session (in-memory Set, no persistence)
- Parallel `Promise.all()` loading per exercise with per-exercise error isolation
- ExerciseCard `suggestion` prop is optional — component works unchanged without it
- `equipment` field added to ExerciseGroup interface and populated from exerciseMap
- ~5 i18n keys added to de.json for banner text (en.json deferred to S07)
- Structured console logging with timing for suggestion loading

## Proof Level

- This slice proves: integration
- Real runtime required: yes (workout page must render banners from real analytics engine output)
- Human/UAT required: yes (visual inspection of banner positioning, dismiss behavior, and mobile viewport fit)

## Verification

- `pnpm test -- --grep "progression"` — existing S01 progressionAdvisor unit tests still pass (no regression)
- `pnpm run build` — zero build errors, confirming all imports and types resolve
- Manual verification: on a running dev server, open an active workout session with exercises that have ≥2 completed sessions with avg RIR ≥2. Confirm:
  1. Banner appears on qualifying exercises with correct weight text
  2. Banner does not appear on exercises without enough history
  3. Dismissing a banner hides it; it does not reappear during the same session
  4. Workout sets render before suggestions load (no blocking)
- `grep -c 'progression_' apps/mobile/messages/de.json` returns ≥5 (i18n keys present)

## Observability / Diagnostics

- Runtime signals: `[Progression]` prefixed structured console logs with exercise count, suggestion count, per-exercise errors, and total duration in ms (mirrors `[PR]` pattern from S03)
- Inspection surfaces: Browser console during active workout — `[Progression] Suggestion loading` log shows timing and results per exercise
- Failure visibility: Per-exercise errors logged with exercise ID and error message; orchestrator-level failure returns empty Map (never throws, never blocks UI)
- Redaction constraints: None — no secrets or PII in suggestion data

## Integration Closure

- Upstream surfaces consumed:
  - `src/lib/services/analytics/progressionAdvisor.ts` — `getProgressionSuggestion()` (S01, no changes)
  - `src/lib/types/analytics.ts` — `ProgressionSuggestion` type (S01, no changes)
  - `src/lib/components/workout/ExerciseCard.svelte` — existing component (M001/S03)
  - `src/routes/workout/[sessionId]/+page.svelte` — workout page (M001/S03)
  - `packages/ui/src/components/ui/alert/` — Alert, AlertTitle, AlertDescription (design system)
- New wiring introduced in this slice:
  - `src/lib/services/analytics/progressionSuggestionLoader.ts` — orchestrator function
  - `src/lib/components/workout/ProgressionBanner.svelte` — banner display component
  - ExerciseCard gains optional `suggestion` prop
  - Workout page calls orchestrator after `loadSession()`, passes suggestions to ExerciseCard
- What remains before the milestone is truly usable end-to-end:
  - S05: Deload auto-adjustment
  - S06: Freemium gate (will suppress suggestions for free users)
  - S07: i18n English translations for all S04 keys

## Tasks

- [x] **T01: Build progression suggestion loader and ProgressionBanner component** `est:1h`
  - Why: Creates the orchestrator service that calls `getProgressionSuggestion()` in parallel per exercise with error isolation, and the display component that renders the suggestion inside an Alert. These are the two standalone pieces before integration.
  - Files: `apps/mobile/src/lib/services/analytics/progressionSuggestionLoader.ts`, `apps/mobile/src/lib/components/workout/ProgressionBanner.svelte`
  - Do: Build `loadProgressionSuggestions(exerciseIds: UUID[])` returning `Map<UUID, ProgressionSuggestion>` with `Promise.all()`, per-exercise try/catch, structured `[Progression]` logging with timing. Build `ProgressionBanner.svelte` taking `suggestion: ProgressionSuggestion` and `ondismiss` callback, using Alert + AlertTitle + AlertDescription + TrendingUp icon + X dismiss button. Add ~5 i18n keys to de.json for banner text.
  - Verify: `pnpm run build` succeeds; `grep -c 'progression_' apps/mobile/messages/de.json` returns ≥5
  - Done when: Both files exist, compile without errors, and de.json has all required keys

- [x] **T02: Integrate suggestions into workout page and ExerciseCard** `est:45m`
  - Why: Wires the loader and banner into the live workout flow — the actual user-facing integration. Adds `equipment` to ExerciseGroup, calls the loader after session data loads, passes suggestions to ExerciseCard, and renders the banner with dismiss support.
  - Files: `apps/mobile/src/routes/workout/[sessionId]/+page.svelte`, `apps/mobile/src/lib/components/workout/ExerciseCard.svelte`
  - Do: Add `equipment` field to ExerciseGroup interface, populate from exerciseMap during group construction. Add reactive `progressionSuggestions` state (`Map<string, ProgressionSuggestion>`) and `dismissedSuggestions` state (`Set<string>`). Call `loadProgressionSuggestions()` after `loadSession()` completes (fire-and-forget, non-blocking). Add optional `suggestion` prop to ExerciseCard Props interface. Render ProgressionBanner inside ExerciseCard above sets when suggestion is non-null. Pass dismiss handler that adds exerciseId to dismissedSuggestions set.
  - Verify: `pnpm run build` succeeds; `pnpm test -- --grep "progression"` passes (no regression); manual: open workout page for qualifying exercise → banner appears → dismiss works → non-qualifying exercises show no banner
  - Done when: Progression banners appear on qualifying exercises in an active workout, are dismissible, and workout sets render before suggestions load

## Files Likely Touched

- `apps/mobile/src/lib/services/analytics/progressionSuggestionLoader.ts` (new)
- `apps/mobile/src/lib/components/workout/ProgressionBanner.svelte` (new)
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` (modified)
- `apps/mobile/src/lib/components/workout/ExerciseCard.svelte` (modified)
- `apps/mobile/messages/de.json` (modified)

# S05: Onboarding & Program Templates

**Goal:** First-launch users are presented with starter program templates (PPL, Upper/Lower, Full Body), pick one, and get a fully configured program with exercises, sets, and rep ranges — training-ready in under 2 minutes.
**Demo:** Launch app with no onboarding flag → see onboarding screen with 3 template cards → tap PPL → program is created with 6 training days, exercises, assignments, and mesocycle → redirected to home → subsequent launches skip onboarding and go straight to home.

## Must-Haves

- Three starter program templates: Push/Pull/Legs (6 days), Upper/Lower (4 days), Full Body (3 days)
- Each template defines training days with exercises, target sets, and rep ranges referencing seed exercise names
- `ExerciseRepository.getByName()` exact-match query method for reliable exercise resolution
- `createProgramFromTemplate()` service that resolves exercise names → IDs and creates program + days + assignments + mesocycle atomically
- Onboarding status persisted via `@capacitor/preferences` (`onboarding_completed` key)
- Root layout checks onboarding status on mount and redirects first-launch users to `/onboarding`
- `/onboarding` route with template selection cards and a "Skip" option
- Loading state during template creation to prevent double-taps
- All new user-facing strings added to `de.json` (base locale); `en.json` translations in a parallel task
- Vitest tests for template data integrity, exercise resolution, and `createProgramFromTemplate()` service

## Proof Level

- This slice proves: integration
- Real runtime required: yes (SQLite via sql.js mock in tests; Capacitor Preferences in real runtime)
- Human/UAT required: no (UAT deferred to S06 polish pass)

## Verification

- `pnpm --filter mobile test -- --grep "template"` — tests for template data integrity (all exercise names exist in SEED_EXERCISES), template service creates correct program structure, and getByName exact-match works
- `pnpm --filter mobile test -- --grep "onboarding"` — tests for onboarding preference service (get/set/clear)
- `pnpm --filter mobile build` — build passes with no type errors from new routes/components
- Manual: load app in browser, verify redirect to /onboarding, pick a template, verify program appears on /programs page

## Observability / Diagnostics

- Runtime signals: `[Onboarding]` prefixed console logs for template creation lifecycle (start, exercise resolution, creation, completion or failure). `[TemplateService]` prefixed logs for per-step progress.
- Inspection surfaces: `@capacitor/preferences` key `onboarding_completed` — readable via Capacitor DevTools or programmatic `Preferences.get()`. Programs table in SQLite shows created program.
- Failure visibility: Template creation errors surface as toast notifications via sonner. Exercise name resolution failures are collected and logged as a batch before aborting creation. Console logs include the failing exercise names.
- Redaction constraints: none (no secrets or PII in this slice)

## Integration Closure

- Upstream surfaces consumed:
  - `src/lib/db/repositories/exercise.ts` — ExerciseRepository (new `getByName()` method)
  - `src/lib/db/repositories/program.ts` — ProgramRepository (createProgram, addTrainingDay, addExerciseAssignment, createMesocycle)
  - `src/lib/db/seed/exercises.ts` — SEED_EXERCISES for template name validation
  - `src/lib/types/program.ts` — ProgramInsert, TrainingDayInsert, ExerciseAssignmentInsert, MesocycleInsert
  - `@capacitor/preferences` — Preferences.get/set for onboarding flag
- New wiring introduced in this slice:
  - `src/lib/data/templates/` — static template definitions (pure data)
  - `src/lib/services/template-service.ts` — createProgramFromTemplate() orchestrator
  - `src/lib/services/onboarding.ts` — onboarding preference helpers (isOnboardingCompleted, completeOnboarding)
  - `src/routes/onboarding/` — onboarding route with template selection UI
  - `src/routes/+layout.svelte` — onboarding guard added to root layout
- What remains before the milestone is truly usable end-to-end: S06 design polish (haptics, dark/light mode, dnd-kit), S07 full i18n audit and en translations

## Tasks

- [x] **T01: Add getByName to ExerciseRepository, define program templates, and write template service tests** `est:1h`
  - Why: The template service needs exact-match exercise lookup (not LIKE), and tests must define expected behavior before implementation. Template data definitions are pure data that tests validate against SEED_EXERCISES.
  - Files: `src/lib/db/repositories/exercise.ts`, `src/lib/data/templates/index.ts`, `src/lib/data/templates/ppl.ts`, `src/lib/data/templates/upper-lower.ts`, `src/lib/data/templates/full-body.ts`, `src/lib/data/templates/types.ts`, `src/lib/db/__tests__/template-service.test.ts`
  - Do: Add `getByName(name: string)` exact-match method to ExerciseRepository. Define `ProgramTemplate` type and three template data files. Write failing tests: (1) all template exercise names exist in SEED_EXERCISES, (2) getByName returns exact match only, (3) createProgramFromTemplate creates correct structure.
  - Verify: `pnpm --filter mobile test -- --grep "template"` — template data validation tests pass, getByName tests pass, service tests fail (service not yet written)
  - Done when: getByName method works, all 3 template data files defined, test file exists with template integrity + service tests (service tests expected to fail)

- [x] **T02: Implement template creation service and onboarding preferences** `est:1h`
  - Why: This is the core business logic — resolving exercise names to IDs and atomically creating program + days + assignments + mesocycle from a template. Plus the Preferences-backed onboarding state.
  - Files: `src/lib/services/template-service.ts`, `src/lib/services/onboarding.ts`, `src/lib/db/__tests__/template-service.test.ts`
  - Do: Implement `createProgramFromTemplate(templateId)` — resolve all exercise names first (fail-fast if any missing), then create program → days → assignments → mesocycle. Implement `isOnboardingCompleted()`, `completeOnboarding()`, `resetOnboarding()` using `@capacitor/preferences`. All template service tests should now pass.
  - Verify: `pnpm --filter mobile test -- --grep "template"` — all tests pass including service creation tests. `pnpm --filter mobile test -- --grep "onboarding"` — preference tests pass.
  - Done when: createProgramFromTemplate creates a full program with correct day count, exercise count, sets, reps for each template. Onboarding preference helpers work.

- [x] **T03: Build onboarding route UI and wire root layout guard** `est:1h`
  - Why: The user-facing onboarding flow — template selection cards on `/onboarding`, loading state during creation, redirect on first launch from root layout.
  - Files: `src/routes/onboarding/+page.svelte`, `src/routes/onboarding/+layout.ts`, `src/lib/components/onboarding/TemplateCard.svelte`, `src/routes/+layout.svelte`, `messages/de.json`
  - Do: Create `/onboarding` route with template selection cards (icon, name, description, day count badge). Add loading overlay during creation. Add "Skip" button. Wire root layout to check `isOnboardingCompleted()` on mount and redirect to `/onboarding` if not set. After template creation or skip, call `completeOnboarding()` and navigate to `/`. Add all new de.json keys.
  - Verify: `pnpm --filter mobile build` passes. Manual: open app → see onboarding → pick PPL → redirected to home → programs page shows new program → reload → no onboarding shown.
  - Done when: Full onboarding flow works in browser, de.json has all new keys, build passes.

- [x] **T04: Add en.json translations for onboarding strings** `est:15m`
  - Why: i18n rule requires all locales stay synchronized. de.json is source of truth, en.json must have matching keys.
  - Files: `messages/en.json`
  - Do: Add English translations for all new onboarding keys added in T03. Verify key count matches de.json.
  - Verify: `cd apps/mobile/messages && jq 'keys | length' de.json` equals `jq 'keys | length' en.json`
  - Done when: en.json has all onboarding keys with proper English translations, key counts match.

## Files Likely Touched

- `apps/mobile/src/lib/db/repositories/exercise.ts` — add getByName()
- `apps/mobile/src/lib/data/templates/types.ts` — ProgramTemplate type definition
- `apps/mobile/src/lib/data/templates/ppl.ts` — Push/Pull/Legs template data
- `apps/mobile/src/lib/data/templates/upper-lower.ts` — Upper/Lower template data
- `apps/mobile/src/lib/data/templates/full-body.ts` — Full Body template data
- `apps/mobile/src/lib/data/templates/index.ts` — template registry (exports all templates)
- `apps/mobile/src/lib/services/template-service.ts` — createProgramFromTemplate()
- `apps/mobile/src/lib/services/onboarding.ts` — Preferences-backed onboarding state
- `apps/mobile/src/lib/db/__tests__/template-service.test.ts` — template + service tests
- `apps/mobile/src/routes/onboarding/+page.svelte` — onboarding template selection page
- `apps/mobile/src/routes/onboarding/+layout.ts` — ssr: false
- `apps/mobile/src/lib/components/onboarding/TemplateCard.svelte` — template card component
- `apps/mobile/src/routes/+layout.svelte` — onboarding guard
- `apps/mobile/messages/de.json` — new German onboarding strings
- `apps/mobile/messages/en.json` — new English onboarding strings

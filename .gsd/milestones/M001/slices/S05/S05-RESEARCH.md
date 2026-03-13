# S05: Onboarding & Program Templates — Research

**Date:** 2026-03-12

## Summary

S05 delivers the first-launch onboarding flow and starter program templates (PPL, Upper/Lower, Full Body). The goal is to get a new user from app launch to a training-ready state in under 2 minutes (R008). This slice builds on S01's exercise library + seed data and S02's program/mesocycle repository.

The primary challenge is **exercise name resolution** — templates reference seed exercises by name, which must be looked up at runtime against the exercises table. The secondary challenge is **onboarding state persistence** — tracking whether the user has completed onboarding requires `@capacitor/preferences` (already installed) since this is app-level state, not relational data.

The approach is straightforward: define static template data structures in `src/lib/data/templates/`, build a template-to-program creation service that resolves exercise names and calls ProgramRepository methods, persist onboarding completion in Capacitor Preferences, and gate the root layout to redirect first-launch users to an `/onboarding` route.

## Recommendation

**Three-layer approach:**

1. **Template definitions** — Pure data objects defining each program template (PPL, Upper/Lower, Full Body) with exercise names, sets, and rep ranges. No DB access, easily testable and extensible.

2. **Template service** — `createProgramFromTemplate()` function that resolves exercise names to IDs via `ExerciseRepository.search()`, then calls `ProgramRepository.createProgram()`, `addTrainingDay()`, `addExerciseAssignment()`, and `createMesocycle()` in sequence. Wraps the multi-step creation in error handling.

3. **Onboarding flow** — A dedicated `/onboarding` route with template selection cards. On first launch, root layout checks Preferences for `onboarding_completed`. If not set, redirect to `/onboarding`. After template selection + program creation, set the flag and navigate to home.

Use `@capacitor/preferences` for the onboarding flag — it's already in dependencies and is the right tool for simple key-value app state. Do NOT use SQLite for this — it's not relational data.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Exercise name → ID resolution | `ExerciseRepository.search(name)` | Already returns exercises by name LIKE match; exact-match can filter results |
| Program + days + assignments creation | `ProgramRepository.createProgram()`, `.addTrainingDay()`, `.addExerciseAssignment()`, `.createMesocycle()` | Full CRUD already exists with Zod validation and UUID generation |
| App-level flag persistence | `@capacitor/preferences` (`Preferences.set/get`) | Already in package.json, native key-value storage, web fallback included |
| Form components | shadcn-svelte Card, Button, Badge components | Consistent design system |
| i18n | Paraglide `m.*()` message functions | Already configured, de.json is source of truth |

## Existing Code and Patterns

- `apps/mobile/src/lib/db/repositories/program.ts` — ProgramRepository with `createProgram(data, trainingDays?)`, `addTrainingDay()`, `addExerciseAssignment()`, `createMesocycle()`. Note: `createProgram` already supports atomic multi-day creation via transactions, but exercise assignments must be added separately after day creation (no nested assignment support in createProgram).
- `apps/mobile/src/lib/db/repositories/exercise.ts` — ExerciseRepository with `search(query)` for name-based lookup. Returns `Exercise[]` — filter to exact match. No `getByName()` exists; add one or use `search(name)` and filter for exact match.
- `apps/mobile/src/lib/db/seed/exercises.ts` — `SEED_EXERCISES` array with 57 exercises. Template exercise names MUST match these exactly. Available names: "Bench Press", "Squat", "Deadlift", "Pull-Up", "Overhead Press", "Barbell Row", "Lat Pulldown", etc.
- `apps/mobile/src/lib/types/program.ts` — `ProgramInsert`, `TrainingDayInsert`, `ExerciseAssignmentInsert`, `MesocycleInsert` types and Zod schemas. `ExerciseAssignmentInsert` takes `exercise_id`, `target_sets`, `min_reps`, `max_reps`.
- `apps/mobile/src/routes/+layout.svelte` — Root layout, currently renders ModeWatcher + Toaster + children. Onboarding guard goes here.
- `apps/mobile/src/routes/+page.svelte` — Home dashboard with 4 navigation cards. No current onboarding awareness.
- `apps/mobile/src/routes/programs/+page.svelte` — Pattern for DB-backed page: `$effect` → `getDb()` → load data → render. Follow this for onboarding page.
- `apps/mobile/src/lib/components/programs/ProgramCard.svelte` — Card-based list item pattern. Template selection cards should follow this visual pattern.
- `apps/mobile/messages/de.json` / `en.json` — Currently 215 keys each. Must stay synchronized.
- `packages/ui/src/globals.css` — Has driver.js coach mark styles pre-configured, but driver.js is NOT in mobile app dependencies. Not needed for S05 — onboarding is template selection, not a guided tour.

## Constraints

- **Exercise names in templates must exactly match seed data names** — Templates reference exercises by name string (e.g., "Bench Press"). Resolution happens at runtime against the exercises table. If a seed exercise name changes or a template references a non-existent exercise, creation silently skips or fails. Must handle gracefully.
- **`@capacitor/preferences` is key-value strings only** — `Preferences.get()` returns `{ value: string | null }`. For the boolean onboarding flag, store `"true"` and check for non-null.
- **No `getByName()` on ExerciseRepository** — Only `search(query)` exists, which uses LIKE. Need either: (a) add `getByName(exactName)` method, or (b) use `search(name)` and filter for exact match in JS. Option (a) is cleaner and avoids false positives (e.g., searching "Curl" matching "Barbell Curl", "Cable Curl", etc.).
- **ProgramRepository has no batch assignment creation** — Each exercise assignment is added one at a time via `addExerciseAssignment()`. For a 6-exercise training day, that's 6 sequential DB calls. Acceptable for one-time template creation, but plan for it taking a few seconds on slower devices.
- **Onboarding guard must not block returning users** — The `@capacitor/preferences` check is async. Root layout or onboarding route must handle the async check without a flash of wrong content.
- **SSR is disabled** (`export const ssr = false` in root layout.ts) — Client-only rendering, so all DB/Preferences access happens in the browser/Capacitor runtime. No server-side concerns.
- **i18n base locale is de** — All new keys go to `de.json` first. en.json translations added in a separate parallel task.
- **Zod4 syntax required** — Use `z.uuid()`, `z.string().min()`, etc. (not zod3 patterns).

## Common Pitfalls

- **Race condition on onboarding check** — If the root layout checks Preferences asynchronously and the child route starts rendering before the check completes, the user sees a flash of the home screen before being redirected to onboarding. Mitigation: use a loading state in the root layout that blocks rendering until onboarding status is resolved, or perform the check in the onboarding route itself with a redirect out if already completed.
- **Exercise name mismatch between template and seed** — A typo in the template exercise name (e.g., "Bench press" vs "Bench Press") causes silent failure. Mitigation: define a `TEMPLATE_EXERCISES` constant that is verified against `SEED_EXERCISES` at test time. Use exact-match SQL query, not LIKE.
- **Template creation partially fails mid-way** — If exercise resolution fails for one assignment (exercise was deleted/renamed), the program is created but incomplete. Mitigation: resolve ALL exercise names first before creating the program. If any name fails to resolve, abort the entire operation.
- **Multiple onboarding completions** — User could theoretically trigger template creation twice (e.g., double-tap, slow network). Mitigation: set the Preferences flag immediately before/during creation, not after. Use a `creating` state to disable the UI.
- **Testing template creation without Capacitor runtime** — The template service calls ProgramRepository which calls SQLite. Unit tests need the sql.js mock already established in `src/lib/db/__tests__/test-helpers.ts`. Template resolution can be tested separately with pure functions.

## Open Risks

- **Exercise name stability** — If a future slice renames seed exercises, all templates break silently. Consider adding a test that validates all template exercise names exist in `SEED_EXERCISES`. Low probability but high impact.
- **Template creation performance** — PPL has 6 days x ~5-6 exercises = ~36 sequential DB writes (days + assignments + mesocycle). On a slow device, this could take 2-3 seconds. Acceptable but should show a loading indicator. Not a blocker.
- **Onboarding re-entry** — If the user uninstalls/reinstalls, Preferences are cleared and onboarding shows again, but the exercises table is also re-seeded. No state conflict. If the user clears app data (Android), same behavior. This is correct.
- **No "skip onboarding" path defined** — D015 says "Pick a starter template, not build-your-own." But should there be a skip option for users who want to create their own program from scratch? The decision says templates, but the programs page already supports manual creation. Consider adding a "Skip" / "Create my own" option on the onboarding screen that just marks onboarding complete and navigates to home.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| SvelteKit | spences10/svelte-skills-kit@sveltekit-structure (268 installs) | available — general SvelteKit patterns, not specific to this slice's needs |
| Capacitor | none found via skills search | none found |
| driver.js | N/A — not needed for S05 | not applicable |

No skills are directly relevant to install for S05. The work is standard SvelteKit + existing repository patterns. The available SvelteKit skills cover general structure, not the specific template-creation + onboarding-guard pattern needed here.

## Sources

- Exercise seed data verified at 57 exercises covering all muscle groups (source: `apps/mobile/src/lib/db/seed/exercises.ts`)
- `@capacitor/preferences` API: `get({key})` returns `{value: string|null}`, `set({key, value})` persists string (source: `references/capacitor-plugins/preferences/src/definitions.ts`)
- ProgramRepository supports transactions for multi-table inserts, individual assignment creation (source: `apps/mobile/src/lib/db/repositories/program.ts`)
- D015 confirms "Pick a starter template, not build-your-own" as onboarding approach (source: `.gsd/DECISIONS.md`)
- D019 confirms 4-table normalized model: programs, training_days, exercise_assignments, mesocycles (source: `.gsd/DECISIONS.md`)
- S02/T05 summary confirms mesocycle form + program detail page are complete (source: `.gsd/milestones/M001/slices/S02/tasks/T05-SUMMARY.md`)
- Current i18n state: 215 keys in both de.json and en.json (source: `apps/mobile/messages/*.json`)

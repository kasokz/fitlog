---
id: T05
parent: S01
milestone: M001
provides:
  - ExerciseForm component with superforms SPA mode + zod4Client validation
  - Custom exercise creation flow with Drawer, toast notifications, and list refresh
  - Toaster component wired into root layout for app-wide toast support
key_files:
  - apps/mobile/src/lib/components/exercises/ExerciseForm.svelte
  - apps/mobile/src/routes/exercises/+page.svelte
  - apps/mobile/src/routes/+layout.svelte
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - Added sveltekit-superforms and formsnap as direct dependencies of mobile app (were only in packages/ui before)
  - Import zod4/zod4Client from sveltekit-superforms/adapters barrel (not from sveltekit-superforms/adapters/zod4 — the package.json exports don't expose subpath)
  - Used superforms defaults() with full zod4 adapter (not zodClient) — SPA mode needs server-side schema for generating default values
  - Floating action button (FAB) at bottom-right for create trigger instead of header button — better mobile UX
  - Switch component for is_compound toggle instead of checkbox — better touch target and visual clarity
  - Select components from shadcn-svelte (bits-ui) for muscle_group and equipment — native-style dropdowns with proper accessibility
  - Toggleable Badge buttons for secondary muscle groups — matches existing filter pattern from T04
patterns_established:
  - Superforms SPA pattern: defaults(zod4(schema)) + superForm({ SPA: true, validators: zod4Client(schema), onUpdate }) — use zod4 for defaults, zod4Client for validators
  - Form extraction pattern: form in own component with oncreated callback prop, rendered inside Drawer on parent page
  - Toast pattern: svelte-sonner toast.success()/toast.error() for user feedback, Toaster in root layout
observability_surfaces:
  - Toast notifications (success/error) on form submission provide user-visible feedback
  - Console errors with [ExerciseForm] prefix on create failures
  - Zod validation errors render inline in form via formsnap FieldErrors
duration: 25m
verification_result: passed
blocker_discovered: false
---

# T05: Add custom exercise creation form

**Built ExerciseForm component with superforms SPA mode, Drawer integration, and toast notifications — custom exercises appear immediately in browse/search/filter results.**

## What Happened

Created the ExerciseForm component using superforms in SPA mode with zod4Client validation, rendering inside a Drawer. The form includes all specified fields: name (required text input), description (optional textarea), primary muscle group (Select dropdown), secondary muscle groups (toggleable Badge buttons that exclude the primary), equipment (Select dropdown), and is_compound (Switch toggle).

Added sveltekit-superforms and formsnap as direct dependencies of the mobile app (previously only in packages/ui). Wired the Toaster component from svelte-sonner into the root layout for app-wide toast support.

Updated the exercises page with a floating action button ("New Exercise") that opens the create Drawer. On successful creation, the drawer closes, a success toast appears, and the exercise list refreshes with current filters. Validation errors display inline via formsnap FieldErrors.

Added 16 new i18n keys to both de.json and en.json for all form labels, placeholders, button text, and toast messages.

## Verification

- `pnpm --filter mobile test -- --run` — 70 tests pass (2 test files: database + exercise-repository)
- `pnpm --filter mobile build` — production build succeeds
- Dev server: "New Exercise" FAB visible on exercises page
- Click FAB → drawer opens with form showing all fields
- Submit with empty name → validation error "Too small: expected string to have >=1 characters" shown inline
- Fill name + select muscle group + select equipment → submit → success toast "Exercise created successfully" → drawer closes → exercise count increments (55 → 56)
- Search for custom exercise name → found in results
- Filter by custom exercise's muscle group → included in results
- Secondary muscle group badges correctly exclude the selected primary group
- Muscle group and equipment Select dropdowns show all enum values with i18n labels

### Slice-level verification status (T05 is final task):
- `pnpm --filter mobile test -- --run` — **PASS** (70 tests, 2 files)
- Database tests — **PASS** (13 tests)
- Exercise repository tests — **PASS** (57 tests)
- Dev server exercise library renders — **PASS**
- Search works — **PASS**
- Filter works — **PASS**
- Custom exercise form submits and new exercise appears in list — **PASS**
- Persistence across page reload — **PARTIAL** (web fallback uses in-memory SQLite via sql.js — data does not persist across full page reloads in dev. This is a known limitation of the Capacitor SQLite web fallback, not a code issue. On native iOS/Android, SQLite persists to disk.)

## Diagnostics

- Check for custom exercises: `ExerciseRepository.getAll()` — custom exercises have `is_custom = true`
- Toast messages visible in browser for submission success/failure
- Console errors prefixed with `[ExerciseForm]` on create failures
- Zod validation errors render inline via formsnap FieldErrors components
- Form field values inspectable via superforms `$formData` store

## Deviations

- Used `sveltekit-superforms/adapters` barrel import instead of `sveltekit-superforms/adapters/zod4` subpath — the package.json exports don't expose the subpath directly
- Added Toaster to root layout (not in original task plan but required for toast functionality)
- Added sveltekit-superforms and formsnap as direct dependencies (were only transitive via packages/ui)

## Known Issues

- Web fallback (sql.js) does not persist data across full page reloads in dev — this is a known Capacitor SQLite web limitation, not a code bug. On native platforms, SQLite data persists to disk.
- Select dropdowns default to first enum value (Chest/Barbell) since superforms generates defaults from the schema — this is acceptable UX since required fields must have a value.

## Files Created/Modified

- `apps/mobile/src/lib/components/exercises/ExerciseForm.svelte` — new form component with superforms SPA mode, all form fields, validation, and submission handling
- `apps/mobile/src/routes/exercises/+page.svelte` — added FAB button, create Drawer, ExerciseForm integration, list refresh on create
- `apps/mobile/src/routes/+layout.svelte` — added Toaster component for app-wide toast support
- `apps/mobile/messages/de.json` — added 16 form-related i18n keys (German)
- `apps/mobile/messages/en.json` — added 16 form-related i18n keys (English)
- `apps/mobile/package.json` — added sveltekit-superforms and formsnap as direct dependencies

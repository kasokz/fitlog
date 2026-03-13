# S03: Data Export (CSV/JSON)

**Goal:** Users can export complete workout history as CSV and structured data as JSON from the Settings screen, shared via native share sheet (or browser download on web).
**Demo:** Open Settings → tap "Export as CSV" → native share sheet opens with workout log CSV and body weight CSV files. Tap "Export as JSON" → share sheet opens with a single JSON file containing all user data.

## Must-Haves

- Denormalized workout log CSV with columns: Date, Program, Training Day, Exercise, Set #, Set Type, Weight (kg), Reps, RIR, Completed
- Separate body weight CSV with columns: Date, Weight (kg)
- Structured JSON export with all user data (exercises, programs, training days, assignments, mesocycles, sessions, sets, body weight entries)
- Soft-deleted rows excluded from all exports (`WHERE deleted_at IS NULL`)
- CSV fields properly escaped per RFC 4180 (commas, quotes, newlines)
- CSV headers in English for data portability (not localized)
- Native share sheet via `@capacitor/share` on iOS/Android
- Web fallback via Blob download
- Export section in Settings page with two buttons
- Export service is pure-function testable with existing sql.js mock infrastructure

## Verification

- `pnpm -F @repo/mobile test -- --grep "export"` — export service tests pass (CSV generation, JSON generation, RFC 4180 escaping, soft-delete exclusion, empty database handling)
- Manual: Settings page shows Export section with two buttons (requires dev server — user verifies)

## Tasks

- [x] **T01: Build export service with CSV/JSON generation and tests** `est:1h30m`
  - Why: Core data transformation logic — queries SQLite, produces CSV and JSON strings. Must be correct (escaping, soft-delete filtering, denormalized joins) and tested before wiring to UI.
  - Files: `apps/mobile/src/lib/services/export.ts`, `apps/mobile/src/lib/db/__tests__/export.test.ts`
  - Do: Implement `generateWorkoutCSV()`, `generateBodyWeightCSV()`, `generateFullJSON()` as pure async functions using `dbQuery`. Denormalized SQL joins sessions → sets → exercises for workout CSV. RFC 4180 `escapeCSV()` helper. JSON uses nested structure with exercise metadata for self-containment. Write comprehensive tests using sql.js mock: seed realistic data across all tables, assert CSV content line-by-line, assert JSON structure and completeness, test edge cases (empty DB, soft-deleted rows excluded, special characters in exercise names).
  - Verify: `pnpm -F @repo/mobile test -- --grep "export"` passes all tests
  - Done when: Export service produces correct CSV and JSON from test data, all edge cases covered

- [x] **T02: Install Capacitor plugins, add file sharing wrapper, wire export UI into Settings** `est:1h`
  - Why: Connects the export service to the user — installs Filesystem/Share plugins, writes the file-sharing wrapper with web fallback, adds export buttons to Settings page with loading states and toast feedback.
  - Files: `apps/mobile/src/lib/services/export-file.ts`, `apps/mobile/src/routes/settings/+page.svelte`, `apps/mobile/package.json`
  - Do: Install `@capacitor/filesystem` and `@capacitor/share`. Create `export-file.ts` wrapper following the purchase-plugin pattern (platform check, try/catch, `[Export]` prefix logging). On native: `Filesystem.writeFile()` to Cache dir → `Share.share({ files })`. On web: Blob + `<a download>` click. Add Export section to Settings page between Language and Account sections with two Button components. Loading spinner during export, success/error toast. Wire handlers: button click → generate content → write file → share → cleanup.
  - Verify: `pnpm -F @repo/mobile build` succeeds. Manual inspection of Settings page in dev server (user verifies).
  - Done when: Settings page has Export section with CSV and JSON buttons. Native build compiles. Web fallback triggers download.

## Files Likely Touched

- `apps/mobile/src/lib/services/export.ts`
- `apps/mobile/src/lib/services/export-file.ts`
- `apps/mobile/src/lib/db/__tests__/export.test.ts`
- `apps/mobile/src/routes/settings/+page.svelte`
- `apps/mobile/package.json`

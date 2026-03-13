---
id: S03
parent: M004
milestone: M004
provides:
  - Export service with generateWorkoutCSV, generateBodyWeightCSV, generateFullJSON
  - RFC 4180 CSV escaping helpers (escapeCSV, formatCSVRow)
  - File sharing wrapper (shareExportFile, shareMultipleExportFiles) with native/web platform branching
  - Export section in Settings page with CSV and JSON export buttons
  - i18n keys for export UI in de.json and en.json (6 keys each)
requires:
  - slice: none
    provides: none
affects:
  - S05
key_files:
  - apps/mobile/src/lib/services/export.ts
  - apps/mobile/src/lib/services/export-file.ts
  - apps/mobile/src/lib/db/__tests__/export.test.ts
  - apps/mobile/src/routes/settings/+page.svelte
key_decisions:
  - D121: Denormalized workout CSV (sessions/sets/exercises/programs joined), not per-table dumps
  - D122: No external CSV library — RFC 4180 escape function (~20 lines)
  - D123: CSV headers in English for data portability, not localized
  - D124: Filesystem + Share plugins with web Blob fallback
patterns_established:
  - Export service pattern — pure async functions querying via dbQuery, returning formatted strings, no side effects
  - Capacitor file-sharing wrapper pattern — isNative() guard, try/catch, [Export] prefix logging, best-effort cache cleanup, never throws
  - Multi-file CSV export uses single native Share.share({ files }) call
  - Loading state as discriminated union ('csv' | 'json' | null)
observability_surfaces:
  - Console logs with [Export] prefix for native write/share/cleanup lifecycle and web download events
drill_down_paths:
  - .gsd/milestones/M004/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M004/slices/S03/tasks/T02-SUMMARY.md
duration: 45m
verification_result: passed
completed_at: 2026-03-13
---

# S03: Data Export (CSV/JSON)

**Users can export complete workout history as CSV and all data as JSON from Settings, shared via native share sheet (or browser download on web).**

## What Happened

Built a two-task slice: core export service (T01) then UI wiring (T02).

T01 created `export.ts` with three generator functions. `generateWorkoutCSV()` denormalizes sessions → sets → exercises/programs/training_days via LEFT JOINs, producing a single spreadsheet-ready CSV. `generateBodyWeightCSV()` outputs a simple date/weight two-column CSV. `generateFullJSON()` queries all 8 entity tables in parallel via Promise.all, assembles a nested structure (programs → training_days → assignments, sessions → sets) with exercise names inlined for self-containment. All generators exclude soft-deleted rows. RFC 4180 escaping handles commas, double quotes, and newlines. 33 tests cover happy path, edge cases (empty DB, special characters), and soft-delete filtering.

T02 installed `@capacitor/filesystem` and `@capacitor/share`, created `export-file.ts` with platform-aware file sharing (native: write to Cache → share sheet → cleanup; web: Blob + `<a download>`), and wired two buttons into the Settings page Export section. CSV export generates both workout and body weight CSVs and shares them together in one share sheet. JSON export shares a single file. Both have loading spinners, double-tap prevention, and success/error toasts. 6 i18n keys added to de.json and en.json (399 keys each, zero drift).

## Verification

- `pnpm -F mobile test` — **516 tests pass** across 22 test files (no regressions)
- `pnpm -F mobile test -- --grep "export"` — all export tests pass (33 in export.test.ts)
- `pnpm -F mobile build` — succeeds (adapter-static output)
- i18n key sync — 399 keys in both de.json and en.json, zero drift
- Manual Settings page verification — pending (user verifies in dev server)

## Requirements Advanced

- R029 (Data Export) — CSV and JSON export implemented with complete test coverage, soft-delete filtering, RFC 4180 compliance, native share sheet integration

## Requirements Validated

- none — R029 awaits manual UAT (visual confirmation of export flow on device)

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

None.

## Known Limitations

- Web export triggers sequential Blob downloads rather than a share sheet (expected — no Web Share Files API)
- CSV headers are English-only by design (D123) — not localizable
- Manual Settings page verification not yet done (requires dev server)

## Follow-ups

- S05 will add any remaining i18n keys for S03 UI if needed (6 keys already added proactively)

## Files Created/Modified

- `apps/mobile/src/lib/services/export.ts` — Export service with 3 generator functions + CSV escape helpers
- `apps/mobile/src/lib/services/export-file.ts` — File sharing wrapper with native/web platform branching
- `apps/mobile/src/lib/db/__tests__/export.test.ts` — 33-test suite for export functionality
- `apps/mobile/src/routes/settings/+page.svelte` — Added Export section with CSV and JSON buttons
- `apps/mobile/package.json` — Added @capacitor/filesystem and @capacitor/share
- `apps/mobile/messages/de.json` — Added 6 export-related i18n keys
- `apps/mobile/messages/en.json` — Added matching 6 English translations

## Forward Intelligence

### What the next slice should know
- Export is pure client-side — no server dependency. S04 (Sync Status UI) and S05 (i18n) don't need to coordinate with export logic.
- The 6 export i18n keys are already in both locale files, so S05 only needs to verify they're correct, not add them.

### What's fragile
- CSV column order is hardcoded in the denormalized SQL SELECT — if schema changes add columns to workout_sets or sessions, the CSV header won't auto-update.

### Authoritative diagnostics
- `[Export]` prefixed console logs trace the full native file lifecycle (write → share → cleanup). On web, logs show download trigger.

### What assumptions changed
- None — this was a straightforward low-risk slice that executed as planned.

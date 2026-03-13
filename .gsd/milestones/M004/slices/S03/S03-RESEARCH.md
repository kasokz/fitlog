# S03: Data Export (CSV/JSON) — Research

**Date:** 2026-03-13

## Summary

S03 is a low-risk, self-contained slice with no dependencies on S01/S02 (auth/sync). It delivers R029 (Data Export) by reading from the existing local SQLite database and sharing files via the native share sheet. The core work is: (1) an export service that queries all user data and serializes it to CSV and JSON, (2) writing the file to a temporary directory via `@capacitor/filesystem`, (3) sharing via `@capacitor/share`, and (4) a simple export UI section in Settings.

Two new Capacitor plugins are needed: `@capacitor/filesystem` (write temp files to disk) and `@capacitor/share` (native share sheet). The Share plugin reference already exists locally at `references/capacitor-plugins/share/`. Filesystem is a core Capacitor plugin at v8.x, compatible with the project's Capacitor 8 setup. Neither plugin requires native project configuration changes beyond `npx cap sync`.

The export service itself is pure data transformation — highly testable with the existing sql.js test infrastructure. No external CSV library is needed; the data model is simple enough for template-string CSV generation with proper escaping. JSON export is trivial (`JSON.stringify`). The primary design decision is CSV format: a single denormalized "workout log" (date, program, training day, exercise, set#, type, weight, reps, RIR) is more useful to users than raw per-table dumps. Body weight entries export as a separate simple CSV. A complete JSON export provides the structured alternative for data portability.

## Recommendation

### Architecture

```
Settings page
  └─ Export section (new)
       ├─ "Export as CSV" button → exportCSV() → Filesystem.writeFile → Share.share
       └─ "Export as JSON" button → exportJSON() → Filesystem.writeFile → Share.share
```

**Export service** (`src/lib/services/export.ts`):
- Pure functions: `generateWorkoutCSV()`, `generateBodyWeightCSV()`, `generateFullJSON()`
- Queries use existing `dbQuery` — no new repository methods needed
- Denormalized SQL joins produce the export-ready data shape directly
- Returns string content (CSV text or JSON text)

**File handling** (`src/lib/services/export-file.ts` or inline):
- `Filesystem.writeFile()` to `Directory.Cache` (temporary, no backup)
- `Filesystem.getUri()` to get `file://` URI
- `Share.share({ files: [uri] })` to invoke native share sheet
- `Filesystem.deleteFile()` cleanup after share completes (optional — cache dir is auto-cleaned by OS)

**Web fallback**:
- `Filesystem` and `Share` may not be available on web
- Fallback: create a Blob, generate `URL.createObjectURL()`, trigger `<a download>` click
- Or use `navigator.share()` if available (Share web plugin does this)

### CSV Format

**Workout Log CSV** — single denormalized file, most useful for users:
```
Date,Program,Training Day,Exercise,Set #,Set Type,Weight (kg),Reps,RIR,Completed
2026-03-10,PPL,Push Day,Bench Press,1,warmup,60,10,,true
2026-03-10,PPL,Push Day,Bench Press,2,working,80,8,2,true
2026-03-10,PPL,Push Day,Bench Press,3,working,80,7,1,true
```

**Body Weight CSV** — separate file:
```
Date,Weight (kg)
2026-03-10,82.5
2026-03-09,82.3
```

Both files are shared together via `Share.share({ files: [...] })`.

### JSON Format

Structured nested export:
```json
{
  "exported_at": "2026-03-13T14:00:00Z",
  "version": 1,
  "exercises": [...],
  "programs": [{ ..., "training_days": [{ ..., "assignments": [...] }] }],
  "mesocycles": [...],
  "workout_sessions": [{ ..., "sets": [...] }],
  "body_weight_entries": [...]
}
```

Single file, complete data. Includes exercise metadata so the export is self-contained (exercise names resolve without the app).

### Why this approach

- **Denormalized CSV over per-table dumps**: Users want to open their workout history in a spreadsheet and see something meaningful. Raw `workout_sets` rows with UUID foreign keys are useless without joining. A denormalized log is immediately useful.
- **`@capacitor/filesystem` + `@capacitor/share`**: Standard Capacitor core plugins. Filesystem writes the file to a temp location, Share invokes the OS share sheet. This is the canonical pattern for sharing generated files from Capacitor apps. No custom native code needed.
- **No CSV library**: The data is flat and predictable. A 20-line escape+join function handles RFC 4180 CSV correctly. Libraries like PapaParse are overkill here (they're 30KB+ for parsing, which we don't need).
- **Cache directory**: `Directory.Cache` is the right choice for ephemeral export files. OS manages cleanup. No user-visible files left behind.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Write file to device storage | `@capacitor/filesystem` (`Filesystem.writeFile`) | Cross-platform file I/O. Handles iOS/Android path differences. |
| Native share sheet | `@capacitor/share` (`Share.share`) | Cross-platform share API. Accepts `file://` URIs. Handles iOS UIActivityViewController / Android Intent.ACTION_SEND. |
| CSV generation | Template strings + RFC 4180 escape function | Data is simple flat rows. No parsing needed. A library would add unnecessary weight. |
| JSON generation | `JSON.stringify` | Native JS. Structured export is a natural fit. |

## Existing Code and Patterns

- `apps/mobile/src/lib/db/database.ts` — `dbQuery<T>()` is the read interface. Export service calls this directly with denormalized SQL. No new repository methods needed — export queries are read-only, one-off, and don't fit the repository pattern.
- `apps/mobile/src/lib/db/repositories/workout.ts` — `getCompletedSessions()` and `getSessionDetail()` show the denormalized join pattern (sessions + sets + exercise names). Export SQL will follow the same pattern but without pagination.
- `apps/mobile/src/lib/db/repositories/bodyweight.ts` — `getAll()` returns entries ordered by date. Export can use a simpler unbounded query.
- `apps/mobile/src/lib/services/haptics.ts` — Fire-and-forget pattern with try/catch for Capacitor plugin calls. Export file operations should follow the same error resilience pattern.
- `apps/mobile/src/lib/services/purchase-plugin.ts` — Wrapper pattern for Capacitor plugin with platform detection, safe defaults on error, and `[Prefix]` logging. Export plugin wrapper should match this pattern.
- `apps/mobile/src/routes/settings/+page.svelte` — Settings page with section pattern (h2 label + content). Export section fits naturally here. Uses shadcn-svelte Button, existing toast pattern for success/error feedback.
- `apps/mobile/src/lib/db/__tests__/test-helpers.ts` — sql.js mock for `@capgo/capacitor-fast-sql`. Export service tests use this directly — seed test data, run export functions, assert CSV/JSON content.
- `references/capacitor-plugins/share/src/definitions.ts` — Share API accepts `files?: string[]` for sharing multiple file:// URIs. Supported on iOS and Android. Web fallback uses `navigator.share()` (text/URL only, no files).
- `apps/mobile/src/lib/db/schema.sql` — 8 tables. Export covers: exercises (custom only for JSON, all for context), programs, training_days, exercise_assignments, mesocycles, workout_sessions, workout_sets, body_weight_entries. `schema_version` is excluded.

## Constraints

- **`@capacitor/filesystem` and `@capacitor/share` must be installed** — neither is currently in `package.json`. Both are core Capacitor 8 plugins. Install: `pnpm add @capacitor/filesystem @capacitor/share && npx cap sync`.
- **Share `files` parameter only works on iOS and Android** — web fallback needs a different mechanism (Blob + download link, or `navigator.share()` for text). The web Share API does not support file sharing in most browsers.
- **CSV encoding** — Files must be UTF-8. Exercise names may contain special characters (umlauts, accented characters). Standard `Encoding.UTF8` in Filesystem handles this.
- **Large datasets** — Users with years of training data could have thousands of workout_sets. The denormalized CSV query joins 4 tables. SQLite handles this fine locally (no network), but the resulting string could be several MB. `Filesystem.writeFile` handles this (writes to disk, not memory-constrained). Share sheet handles large files natively.
- **Soft-deleted rows excluded** — All export queries must filter `WHERE deleted_at IS NULL`. Consistent with all existing repository queries.
- **No i18n in CSV headers** — CSV column headers should be in English for data portability (import into other tools). UI labels (buttons, toasts) are i18n'd. This matches D085 (template data as English strings).
- **No `user_id` in export** — Client-side SQLite has no `user_id` column (single-user device). Export is all data on the device.

## Common Pitfalls

- **Forgetting CSV escaping** — Fields containing commas, double quotes, or newlines must be quoted per RFC 4180. Exercise descriptions could contain any of these. A proper `escapeCSV(value)` function is essential.
- **Share plugin import on web** — `Share.share({ files: [...] })` will throw on web. Must check `Capacitor.isNativePlatform()` or use try/catch with a Blob download fallback.
- **Filesystem plugin not available on web** — `Filesystem.writeFile` works differently on web (uses IndexedDB). For web export, skip Filesystem entirely and use Blob + download. Platform branching needed.
- **Memory for very large exports** — Building the entire CSV string in memory before writing. For typical fitness data (even heavy users: ~5000 sets), this is fine (<1MB). If paranoid, could stream rows, but unnecessary complexity for this use case.
- **Date formatting in CSV** — `started_at` and `completed_at` are ISO 8601 strings. For CSV, keep ISO format (universally parseable). Don't locale-format dates in CSV — that breaks data portability.
- **Missing exercise names** — If an exercise was deleted (soft-delete), the export join should still resolve its name. Use `LEFT JOIN` and coalesce to "Unknown Exercise" for robustness.

## Open Risks

- **`@capacitor/filesystem` v8 compatibility** — Plugin should be compatible (same major version as core), but hasn't been tested in this project yet. Risk: low. Mitigation: install early, verify basic write/read in dev.
- **iOS share sheet file type detection** — iOS infers file type from extension. `.csv` and `.json` extensions should be recognized correctly, but if not, may need to set UTI type. Risk: very low.
- **Web export UX** — Blob download is functional but less elegant than native share sheet. Acceptable for dev/testing. Not a user-facing concern (app is mobile-first).

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Capacitor | `cap-go/capacitor-skills@capacitor-best-practices` (297 installs) | available — not needed for this slice (simple plugin usage) |
| Capacitor | `cap-go/capacitor-skills@capacitor-plugins` (132 installs) | available — not needed for this slice |

No skills recommended for installation. The work is straightforward Capacitor plugin usage + pure data transformation. The existing codebase patterns are sufficient.

## Sources

- Capacitor Filesystem API — `writeFile`, `getUri`, `deleteFile` with `Directory.Cache` for temp files (source: [Capacitor Docs — Filesystem](https://capacitorjs.com/docs/apis/filesystem))
- Capacitor Share API — `share({ files: [...] })` for native share sheet with file:// URIs (source: [Capacitor Docs — Share](https://capacitorjs.com/docs/apis/share))
- Share plugin definitions — `files?: string[]` supported on iOS and Android (source: `references/capacitor-plugins/share/src/definitions.ts`)
- RFC 4180 — CSV format specification: fields with commas/quotes/newlines must be enclosed in double quotes, double quotes escaped by doubling (source: RFC 4180)
- Existing workout query patterns — denormalized joins in `WorkoutRepository.getCompletedSessions()` and `getSessionDetail()` (source: `apps/mobile/src/lib/db/repositories/workout.ts`)

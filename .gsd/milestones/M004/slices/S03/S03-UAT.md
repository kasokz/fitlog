# S03: Data Export (CSV/JSON) — UAT

**Milestone:** M004
**Written:** 2026-03-13

## UAT Type

- UAT mode: mixed
- Why this mode is sufficient: Export service logic is artifact-driven (33 automated tests). UI integration and native share sheet require human experience on device.

## Preconditions

- Dev server running (`pnpm -F mobile dev`)
- App navigable to Settings page
- For native share sheet: running on iOS/Android device or simulator

## Smoke Test

Open Settings → tap "Als CSV exportieren" → on web: two files download (workout log + body weight). On native: share sheet opens with two files.

## Test Cases

### 1. CSV Export — Workout Log

1. Ensure at least one completed workout session exists in the database
2. Navigate to Settings
3. Tap "Als CSV exportieren"
4. Open the downloaded/shared `fitlog-workouts-YYYY-MM-DD.csv`
5. **Expected:** CSV has header row `Date,Program,Training Day,Exercise,Set #,Set Type,Weight (kg),Reps,RIR,Completed`. Each row represents one set from a completed session. Data matches what's visible in workout history. No soft-deleted rows present.

### 2. CSV Export — Body Weight

1. Ensure at least one body weight entry exists
2. Navigate to Settings → tap "Als CSV exportieren"
3. Open `fitlog-bodyweight-YYYY-MM-DD.csv`
4. **Expected:** Two columns: `Date,Weight (kg)`. Entries match body weight history, ordered by date descending. No soft-deleted entries.

### 3. JSON Export — Full Data

1. Navigate to Settings → tap "Als JSON exportieren"
2. Open `fitlog-export-YYYY-MM-DD.json`
3. **Expected:** Valid JSON with top-level keys: `exported_at`, `version`, `exercises`, `programs`, `training_days`, `exercise_assignments`, `mesocycles`, `workout_sessions`, `workout_sets`, `body_weight_entries`. Programs contain nested training_days and assignments. Sessions contain nested sets. Exercise names are inlined in sets and assignments.

### 4. Loading State and Double-Tap Prevention

1. Navigate to Settings
2. Tap "Als CSV exportieren"
3. While the spinner is visible, tap "Als JSON exportieren"
4. **Expected:** Second tap is ignored (button disabled during export). Spinner shows on CSV button only. After completion, both buttons re-enable.

### 5. Native Share Sheet (iOS/Android only)

1. Run on a device or simulator
2. Navigate to Settings → tap "Als CSV exportieren"
3. **Expected:** Native share sheet appears with two files listed. Can share to Files, Mail, or other apps. After dismissing, no error toast.

## Edge Cases

### Empty Database

1. On a fresh app install with no workout data
2. Tap "Als CSV exportieren"
3. **Expected:** CSV files generated with headers only, no data rows. No error. Success toast shown.

### Special Characters in Exercise Names

1. Create a custom exercise with commas or quotes in the name (e.g., `Bench "Wide" Press, Heavy`)
2. Complete a workout session using that exercise
3. Export as CSV
4. **Expected:** Exercise name properly escaped in CSV (double quotes around field, internal quotes doubled per RFC 4180). File opens correctly in a spreadsheet.

## Failure Signals

- Export button stays in loading state indefinitely
- Error toast appears on export
- CSV file is empty (no header row)
- JSON file is invalid (parse error)
- Soft-deleted entries appear in exported data
- Native share sheet doesn't appear on device
- File names don't include date stamp

## Requirements Proved By This UAT

- R029 (Data Export) — Complete workout history exportable as CSV; all user data exportable as JSON; files shared via native mechanism

## Not Proven By This UAT

- Export file import into third-party tools (Excel, Google Sheets) — manual spot-check recommended but not required
- Export performance with very large datasets (thousands of sessions) — acceptable for current scope

## Notes for Tester

- Web exports trigger browser downloads (no share sheet). This is expected behavior, not a bug.
- CSV headers are intentionally in English for data portability (D123).
- The Export section appears between Language and Account sections in Settings.

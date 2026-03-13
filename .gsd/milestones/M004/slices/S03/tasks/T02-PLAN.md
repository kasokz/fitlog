---
estimated_steps: 5
estimated_files: 4
---

# T02: Install Capacitor plugins, add file sharing wrapper, wire export UI into Settings

**Slice:** S03 — Data Export (CSV/JSON)
**Milestone:** M004

## Description

Install the two Capacitor plugins needed for file export (`@capacitor/filesystem`, `@capacitor/share`), create a file-sharing service wrapper following existing plugin patterns, and add an Export section to the Settings page with CSV and JSON export buttons. The wrapper handles platform branching: native uses Filesystem + Share plugins, web uses Blob + download link fallback.

## Steps

1. Install Capacitor plugins:
   - `cd apps/mobile && pnpm add @capacitor/filesystem @capacitor/share`
   - Run `npx cap sync` from `apps/mobile` to register plugins with native projects

2. Create `apps/mobile/src/lib/services/export-file.ts`:
   - `shareExportFile(filename: string, content: string, mimeType: string)` — main export function
   - Native path: `Filesystem.writeFile({ path: filename, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 })` → `Filesystem.getUri({ path: filename, directory: Directory.Cache })` → `Share.share({ files: [uri] })` → `Filesystem.deleteFile()` cleanup (best-effort)
   - Web path: create Blob → `URL.createObjectURL()` → create `<a>` element with `download` attribute → programmatic click → revoke URL
   - Platform detection via `Capacitor.isNativePlatform()`
   - Follow purchase-plugin pattern: try/catch wrapper, `[Export]` prefix logging, never throws
   - `shareMultipleExportFiles(files: Array<{filename: string, content: string, mimeType: string}>)` — for CSV export (workout + body weight as two files). Native: write both, share with `files: [uri1, uri2]`. Web: zip not worth it — share sequentially or combine into single download.

3. Add Export section to `apps/mobile/src/routes/settings/+page.svelte`:
   - New section between Language and Account sections
   - Section header using existing pattern (`h2` with muted-foreground uppercase)
   - Two buttons: "Export as CSV" (Download icon) and "Export as JSON" (Download icon)
   - Loading state per button (disable both during any export, show spinner on active one)
   - Import and call export service functions + file sharing wrapper
   - Success toast on share completion, error toast on failure
   - Use hardcoded German strings for button labels initially (i18n keys added in S05)
   - Actually — check: the research says i18n is S05 scope. But AGENTS.md says "ALWAYS maintain the baseLocale keys whenever new UI is added." So add `de.json` keys for the export section labels, and matching `en.json` keys.

4. Add i18n keys to `apps/mobile/messages/de.json` and `apps/mobile/messages/en.json`:
   - `export_section_label` — section header
   - `export_csv_button` — CSV button label
   - `export_json_button` — JSON button label
   - `export_success` — success toast
   - `export_error` — error toast with `{error}` param
   - `export_in_progress` — loading state text (optional, may just use spinner)

5. Verify:
   - `pnpm -F @repo/mobile build` succeeds (no import/type errors)
   - Existing tests still pass: `pnpm -F @repo/mobile test`
   - Settings page renders the export section (visual check in dev server — user verifies)

## Must-Haves

- [ ] `@capacitor/filesystem` and `@capacitor/share` installed in `apps/mobile/package.json`
- [ ] `export-file.ts` handles native and web platforms without throwing
- [ ] Web fallback produces a downloadable file (not just console.log)
- [ ] Settings page has Export section with two working buttons
- [ ] Loading state prevents double-tap during export
- [ ] i18n keys added to `de.json` and `en.json` with zero drift
- [ ] Existing tests pass (no regressions from plugin install)

## Verification

- `pnpm -F @repo/mobile build` completes successfully
- `pnpm -F @repo/mobile test` — all existing tests pass (no regressions)
- Settings page visually has Export section (user verifies in dev server)

## Inputs

- `apps/mobile/src/lib/services/export.ts` — T01's export service (generateWorkoutCSV, generateBodyWeightCSV, generateFullJSON)
- `apps/mobile/src/routes/settings/+page.svelte` — existing Settings page to extend
- `apps/mobile/src/lib/services/purchase-plugin.ts` — reference pattern for Capacitor plugin wrapper
- `apps/mobile/src/lib/services/haptics.ts` — reference for fire-and-forget Capacitor service pattern
- `references/capacitor-plugins/share/src/definitions.ts` — Share API type reference

## Expected Output

- `apps/mobile/src/lib/services/export-file.ts` — file sharing wrapper with platform branching
- `apps/mobile/src/routes/settings/+page.svelte` — updated with Export section
- `apps/mobile/package.json` — updated with filesystem + share dependencies
- `apps/mobile/messages/de.json` — new export-related i18n keys
- `apps/mobile/messages/en.json` — matching English translations

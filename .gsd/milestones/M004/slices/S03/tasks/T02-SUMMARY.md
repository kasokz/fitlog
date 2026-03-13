---
id: T02
parent: S03
milestone: M004
provides:
  - File sharing wrapper (shareExportFile, shareMultipleExportFiles) with native/web platform branching
  - Export section in Settings page with CSV and JSON export buttons
  - i18n keys for export UI in de.json and en.json
key_files:
  - apps/mobile/src/lib/services/export-file.ts
  - apps/mobile/src/routes/settings/+page.svelte
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - Multi-file CSV export uses single native Share.share({ files }) call rather than sequential shares — better UX, one share sheet for both files
  - Web fallback triggers sequential Blob downloads rather than zipping — simpler, no zip dependency
  - Export section placed between Language and Account sections in Settings for logical grouping
  - Loading state uses discriminated union ('csv' | 'json' | null) to show spinner on active button while disabling both
patterns_established:
  - Capacitor file-sharing wrapper pattern — isNative() guard, try/catch, [Export] prefix logging, best-effort cache cleanup, never throws
observability_surfaces:
  - Console logs with [Export] prefix for native write/share/cleanup lifecycle and web download events
duration: 20m
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T02: Install Capacitor plugins, add file sharing wrapper, wire export UI into Settings

**Installed @capacitor/filesystem and @capacitor/share, built platform-aware file sharing wrapper, and wired CSV/JSON export buttons into Settings page with loading states and toast feedback.**

## What Happened

Installed both Capacitor plugins and ran `cap sync` to register them with native projects (12 plugins now registered for iOS). Created `export-file.ts` following the purchase-plugin pattern: `shareExportFile` for single files and `shareMultipleExportFiles` for multi-file export. Native path writes to Cache directory, gets URI, shares via Share plugin, then does best-effort cleanup. Web path uses Blob + invisible `<a download>` anchor with URL revocation.

Added Export section to Settings page between Language and Account sections. Two outline buttons with Download icons — "Als CSV exportieren" / "Als JSON exportieren". CSV handler generates both workout and body weight CSVs via Promise.all, then shares them together. JSON handler generates full export and shares as single file. Both include timestamped filenames, loading spinners, double-tap prevention, and success/error toasts.

Added 6 i18n keys to both de.json and en.json with zero key drift (399 keys each, verified via diff).

## Verification

- `pnpm -F @repo/mobile build` — succeeded (adapter-static output)
- `pnpm -F @repo/mobile test` — 516 tests passed across 22 test files, zero regressions
- `pnpm -F @repo/mobile test -- --grep "export"` — all export service tests pass (slice-level check)
- i18n key sync — `diff` on sorted keys between de.json and en.json shows zero drift
- Settings page Export section — present in build output, visual verification pending (user confirms in dev server)

## Diagnostics

Console logs with `[Export]` prefix trace the full lifecycle: `shareExportFile: web download <filename>` or `shareExportFile: native <filename>` → success/failure. Cache cleanup logged as `cache cleaned` or `cache cleanup skipped`.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/services/export-file.ts` — new file sharing wrapper with native/web platform branching
- `apps/mobile/src/routes/settings/+page.svelte` — added Export section with CSV and JSON buttons, loading states, toast feedback
- `apps/mobile/package.json` — added @capacitor/filesystem and @capacitor/share dependencies
- `apps/mobile/messages/de.json` — added 6 export-related i18n keys
- `apps/mobile/messages/en.json` — added matching 6 English translations

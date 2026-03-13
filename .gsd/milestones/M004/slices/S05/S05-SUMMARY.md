---
id: S05
parent: M004
milestone: M004
provides:
  - Verified M004 i18n completeness — all 45 keys in de.json and en.json with zero drift
  - Executable per-milestone i18n verification script pattern
requires:
  - slice: S01
    provides: Auth UI strings (auth_* keys)
  - slice: S02
    provides: Sync UI strings (sync_status_* keys)
  - slice: S03
    provides: Export UI strings (export_* keys)
  - slice: S04
    provides: Account/sync settings UI strings
affects: []
key_files:
  - scripts/verify-i18n-m004.sh
key_decisions:
  - Verification script uses jq + bash natively, no Python/Node dependency
patterns_established:
  - Reusable per-milestone i18n verification script at scripts/verify-i18n-{milestone}.sh
observability_surfaces:
  - "scripts/verify-i18n-m004.sh: exit 0 = all 6 checks pass; non-zero = structured FAIL lines on stderr with specific key names"
drill_down_paths:
  - .gsd/milestones/M004/slices/S05/tasks/T01-SUMMARY.md
duration: 15m
verification_result: passed
completed_at: 2026-03-13
---

# S05: i18n — German (base) + English

**All 45 M004 i18n keys (auth, sync status, export, account settings) verified present and consistent in de.json (410 keys) and en.json (410 keys) with zero key drift — executable verification script confirms completeness.**

## What Happened

S01–S04 proactively added all M004 i18n keys during their respective implementations, so no code changes were needed. This slice was pure verification: an executable bash script (`scripts/verify-i18n-m004.sh`) was written to formally confirm all i18n requirements. The script runs 6 automated checks:

1. **Key count equality** — both locale files have exactly 410 keys
2. **Zero key drift** — sorted key diff between de.json and en.json is empty
3. **45 M004 keys present** — 28 auth_*, 11 sync_status_*, 6 export_* keys exist in both files
4. **Parameter consistency** — all `{...}` parameters match across locales for every key
5. **German Umlaut correctness** — no improper ae/oe/ue sequences in German text
6. **No hardcoded strings** — 5 M004 `.svelte` files verified free of user-facing hardcoded text

All checks pass. Both test suites pass (524 mobile, 26 web). Both apps build successfully.

## Verification

- `bash scripts/verify-i18n-m004.sh` → exit 0, 6/6 checks pass
- `pnpm --filter mobile test` → 524 tests pass (22 test files)
- `pnpm --filter web test` → 26 tests pass (4 test files)
- `pnpm --filter mobile build` → succeeds (adapter-static)
- `pnpm --filter web build` → succeeds (adapter-node)

## Requirements Advanced

- R010 (i18n Support de/en) — M004 UI fully localized: auth screens, sync status, export, account settings

## Requirements Validated

- None newly validated by this slice alone

## New Requirements Surfaced

- None

## Requirements Invalidated or Re-scoped

- None

## Deviations

None — S01–S04 proactively handled all i18n work as planned. No locale file modifications needed.

## Known Limitations

- Verification script checks M004-specific keys only (auth_*, sync_status_*, export_*). General i18n drift is caught by key count equality and sorted diff checks, but content quality of pre-M004 translations is not re-verified.
- Script does not check es.json, fr.json, or it.json — only de.json (base) and en.json as specified in the slice plan.

## Follow-ups

- None

## Files Created/Modified

- `scripts/verify-i18n-m004.sh` — new executable i18n verification script for M004 (6 checks, reusable pattern)

## Forward Intelligence

### What the next slice should know
- M004 is now complete — all 5 slices done. The next work is the M004 milestone completion check.

### What's fragile
- Nothing — this was a verification-only slice with no code changes.

### Authoritative diagnostics
- `bash scripts/verify-i18n-m004.sh` — the single source of truth for M004 i18n completeness. Exit 0 = all good, non-zero = structured failure output.

### What assumptions changed
- Original assumption: some i18n keys might be missing from S01–S04. Reality: all 45 keys were added proactively during implementation — zero corrections needed.

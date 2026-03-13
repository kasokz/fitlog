# S05: i18n — German (base) + English

**Goal:** All M004 UI strings (auth, sync status, export, account settings) have German and English translations with zero key drift between locale files.
**Demo:** A verification script confirms 45 M004 keys exist in both `de.json` and `en.json`, parameters match, no hardcoded strings in M004 `.svelte` files, and all tests pass.

## Must-Haves

- Zero key drift between `de.json` and `en.json` (identical key sets)
- All 45 M004-specific keys (auth_*, sync_status_*, export_*) present in both locales
- Parameters ({time}, {error}, {count}) consistent across locales for every key
- German translations use proper Umlaute (ä, ö, ü — not ae, oe, ue)
- No hardcoded user-facing strings in M004 `.svelte` files (all use `m.*()`)
- `pnpm --filter mobile test` passes (524 tests)
- `pnpm --filter web test` passes (26 tests)
- Both apps build successfully

## Verification

- `bash scripts/verify-i18n-m004.sh` — automated script checking all must-haves above
- `bash scripts/verify-i18n-m004.sh` with a deliberately broken locale file — confirms non-zero exit and descriptive error output (run manually if needed; not automated in CI)
- `pnpm --filter mobile test` — 524 tests pass
- `pnpm --filter web test` — 26 tests pass
- `pnpm --filter mobile build` — succeeds
- `pnpm --filter web build` — succeeds

## Tasks

- [x] **T01: Run i18n verification gauntlet and confirm M004 translations** `est:15m`
  - Why: S01–S04 proactively added all M004 i18n keys — this task formally verifies the work is complete and leaves an executable verification script for future milestones
  - Files: `scripts/verify-i18n-m004.sh`, `apps/mobile/messages/de.json`, `apps/mobile/messages/en.json`
  - Do: Write a bash verification script that checks: (1) key count equality between de.json and en.json, (2) zero key drift via sorted diff, (3) all 45 M004 keys present, (4) parameter consistency across locales, (5) German Umlaut correctness, (6) no hardcoded strings in M004 svelte files. Run the script, then run full test suites and builds. No code changes expected — this is a verification-only task.
  - Verify: `bash scripts/verify-i18n-m004.sh` exits 0, `pnpm --filter mobile test` passes, `pnpm --filter web test` passes, both apps build
  - Done when: Verification script passes all checks, tests pass, builds succeed, confirming S01–S04 i18n work is complete

## Observability / Diagnostics

- **Verification script output:** `scripts/verify-i18n-m004.sh` prints per-check PASS/FAIL with descriptive labels; exits non-zero on first failure with the failing check name in stderr.
- **Key drift detection:** Script emits the exact missing/extra keys when drift is found, not just a count.
- **Parameter mismatch reporting:** Script lists the specific key and mismatched parameters when locales diverge.
- **Umlaut violations:** Script prints the offending key and value when improper `ae`/`oe`/`ue` sequences are found.
- **Hardcoded string detection:** Script lists file:line for any user-facing string not wrapped in `m.*()`.
- **Failure path verification:** If the script detects any issue, it prints a structured summary of all failures before exiting non-zero, enabling agents to diagnose without re-running.

## Files Likely Touched

- `scripts/verify-i18n-m004.sh` (new — verification script)

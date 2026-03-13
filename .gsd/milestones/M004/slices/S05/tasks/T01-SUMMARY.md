---
id: T01
parent: S05
milestone: M004
provides:
  - Executable i18n verification script for M004 confirming all 45 keys, parameter consistency, Umlaut correctness, and no hardcoded strings
key_files:
  - scripts/verify-i18n-m004.sh
key_decisions:
  - Verification script uses jq for JSON key extraction and bash-native checks rather than a Python/Node dependency
patterns_established:
  - Reusable per-milestone i18n verification script pattern at scripts/verify-i18n-{milestone}.sh
observability_surfaces:
  - "scripts/verify-i18n-m004.sh: exit 0 = all 6 checks pass; non-zero = structured FAIL lines on stderr with key names"
duration: 10m
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T01: Run i18n verification gauntlet and confirm M004 translations

**Created executable i18n verification script that confirms all 45 M004 keys are present, consistent, and correctly translated in both de.json and en.json — all tests and builds pass.**

## What Happened

Wrote `scripts/verify-i18n-m004.sh` with 6 automated checks: (1) key count equality (410 in both files), (2) zero key drift via sorted diff, (3) all 45 M004 keys present (28 auth, 11 sync_status, 6 export), (4) parameter `{...}` consistency across locales for every key, (5) German Umlaut correctness (no improper ae/oe/ue), (6) no hardcoded user-facing strings in 5 M004 `.svelte` files. All 6 checks pass. Both test suites pass (524 mobile, 26 web). Both apps build cleanly. No locale file modifications were needed — S01–S04 proactively added all keys correctly.

## Verification

- `bash scripts/verify-i18n-m004.sh` → exit 0, 6/6 checks pass
- `pnpm --filter mobile test` → 524 tests pass (22 test files)
- `pnpm --filter web test` → 26 tests pass (4 test files)
- `pnpm --filter mobile build` → succeeds (adapter-static, build/)
- `pnpm --filter web build` → succeeds (adapter-node)

## Diagnostics

Run `bash scripts/verify-i18n-m004.sh` at any time to re-verify M004 i18n integrity. On failure, each failing check prints `✗ FAIL: <check-name>` to stderr with the specific keys/values that failed. The script is self-contained (requires only jq and bash).

## Deviations

Fixed bash arithmetic: `((PASS++))` returns exit code 1 when PASS starts at 0 under `set -e`. Changed to `PASS=$((PASS + 1))` which always returns 0.

## Known Issues

None.

## Files Created/Modified

- `scripts/verify-i18n-m004.sh` — new executable i18n verification script for M004 (6 checks, reusable pattern)
- `.gsd/milestones/M004/slices/S05/S05-PLAN.md` — added Observability / Diagnostics section and failure-path verification step
- `.gsd/milestones/M004/slices/S05/tasks/T01-PLAN.md` — added Observability Impact section

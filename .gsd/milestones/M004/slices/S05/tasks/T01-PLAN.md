---
estimated_steps: 4
estimated_files: 1
---

# T01: Run i18n verification gauntlet and confirm M004 translations

**Slice:** S05 — i18n — German (base) + English
**Milestone:** M004

## Description

S01–S04 proactively added all 45 M004-specific i18n keys during their implementation. This task creates an executable verification script that formalizes the i18n quality checks, runs it to confirm everything passes, then runs the full test suites and builds to prove nothing is broken. No locale file changes are expected.

## Steps

1. Write `scripts/verify-i18n-m004.sh` that checks:
   - Key count equality between `de.json` and `en.json`
   - Zero key drift (sorted key diff produces no output)
   - All 45 M004 keys present in both files (auth_* 28, sync_status_* 11, export_* 6)
   - Parameter `{...}` consistency between locales for every key
   - German text uses proper Umlaute (no `ae`/`oe`/`ue` where `ä`/`ö`/`ü` belong)
   - No hardcoded user-facing strings in M004 `.svelte` files (auth routes, SyncStatusSection, settings export section)
2. Run the verification script and confirm all checks pass
3. Run `pnpm --filter mobile test` (expect 524 pass) and `pnpm --filter web test` (expect 26 pass)
4. Run `pnpm --filter mobile build` and `pnpm --filter web build` to confirm clean compilation

## Must-Haves

- [ ] Verification script exists at `scripts/verify-i18n-m004.sh` and is executable
- [ ] Script exits 0 confirming all i18n checks pass
- [ ] `pnpm --filter mobile test` — 524 tests pass
- [ ] `pnpm --filter web test` — 26 tests pass
- [ ] Both apps build successfully

## Verification

- `bash scripts/verify-i18n-m004.sh` exits with code 0
- `pnpm --filter mobile test` — all 524 tests pass
- `pnpm --filter web test` — all 26 tests pass
- `pnpm --filter mobile build` — succeeds
- `pnpm --filter web build` — succeeds

## Inputs

- `apps/mobile/messages/de.json` — 410 keys including 45 M004 keys (source of truth)
- `apps/mobile/messages/en.json` — 410 keys matching de.json
- S01–S04 summaries confirming all i18n keys were added proactively during implementation
- S05-RESEARCH.md confirming 5 orphaned keys are intentional (keep, don't remove)

## Expected Output

- `scripts/verify-i18n-m004.sh` — executable verification script for M004 i18n quality (reusable pattern for future milestones)
- Confirmation that all 45 M004 i18n keys are correct, consistent, and complete — no locale file modifications needed

## Observability Impact

- **New artifact:** `scripts/verify-i18n-m004.sh` — future agents can run this script to verify M004 i18n integrity at any time. Exit code 0 = all checks pass; non-zero = structured error output on stderr listing every failing check with key names and values.
- **Inspection surface:** Each check prints `✓ PASS: <check-name>` or `✗ FAIL: <check-name>` to stdout, making it trivial to grep for failures.
- **Failure visibility:** On failure, the script outputs the specific keys/values/files that failed the check before exiting, so agents can diagnose without re-running individual checks.

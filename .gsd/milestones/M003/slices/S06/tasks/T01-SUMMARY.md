---
id: T01
parent: S06
milestone: M003
provides:
  - en-US frameit keyword.strings and title.strings (6 entries each)
  - Comprehensive pre-submission validation script with 30 checks
key_files:
  - apps/mobile/scripts/verify-s06-submission.sh
  - apps/mobile/fastlane/screenshots/en-US/keyword.strings
  - apps/mobile/fastlane/screenshots/en-US/title.strings
key_decisions:
  - Script checks 30 conditions (exceeding the 20+ requirement) organized in 7 sections
  - Product ID consistency is validated bidirectionally (code → StoreKit and StoreKit → code)
patterns_established:
  - Validation script pattern with pass/fail/section functions, colored output, and summary exit code
observability_surfaces:
  - bash apps/mobile/scripts/verify-s06-submission.sh — colored PASS/FAIL per check with summary count
duration: 15m
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T01: Pre-submission validation script and en-US frameit strings

**Created en-US frameit strings for all 6 screenshot entries and a 30-check pre-submission validation script — all passing green.**

## What Happened

1. Created `en-US/keyword.strings` and `en-US/title.strings` with English marketing text matching the 6 Framefile.json filter entries exactly (text taken from the Framefile defaults).
2. Built `verify-s06-submission.sh` with 30 checks across 7 sections: metadata completeness (3), character limits (8), content rules (2), product consistency (6), entitlements (1), fastlane config (2), screenshot pipeline (6), build verification (2).
3. Ran the script — all 30 checks pass, exit 0.

## Verification

- `bash apps/mobile/scripts/verify-s06-submission.sh` → 30 passed, 0 failed, exit 0
- `grep -c '"0' apps/mobile/fastlane/screenshots/en-US/keyword.strings` → 6
- `grep -c '"0' apps/mobile/fastlane/screenshots/en-US/title.strings` → 6
- `pnpm test` passes (run inside script)
- `pnpm run build` succeeds (run inside script)

### Slice-level verification status

- ✅ `bash apps/mobile/scripts/verify-s06-submission.sh` — all 30 checks pass
- ✅ `pnpm test` — passes
- ✅ `pnpm run build` — succeeds
- ✅ `en-US/keyword.strings` and `title.strings` exist with 6 entries each
- ⬜ `apps/mobile/fastlane/E2E_VERIFICATION.md` — not yet created (T02)

## Diagnostics

Run `bash apps/mobile/scripts/verify-s06-submission.sh` at any time to validate all pre-submission prerequisites. Failures show which specific check failed with the actual vs expected value.

## Deviations

Script has 30 checks instead of the planned 20+ minimum — product ID consistency is checked bidirectionally (3 checks code→StoreKit + 3 checks StoreKit→code) for stronger validation.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/fastlane/screenshots/en-US/keyword.strings` — English keyword strings for 6 screenshot entries
- `apps/mobile/fastlane/screenshots/en-US/title.strings` — English title strings for 6 screenshot entries
- `apps/mobile/scripts/verify-s06-submission.sh` — Pre-submission validation script with 30 checks across 7 sections

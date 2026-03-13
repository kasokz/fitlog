# S06: End-to-End Integration & Store Submission — UAT

**Milestone:** M003
**Written:** 2026-03-13

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This slice produces validation tooling and documentation — no new runtime behavior. The validation script is the primary artifact, verifiable by running it. The runbook is a static document checked for completeness.

## Preconditions

- Repository checked out at S06 branch tip
- Node/pnpm available (`pnpm test` and `pnpm run build` must work)

## Smoke Test

Run `bash apps/mobile/scripts/verify-s06-submission.sh` — should exit 0 with "30 passed, 0 failed".

## Test Cases

### 1. Validation script catches all categories

1. Run `bash apps/mobile/scripts/verify-s06-submission.sh`
2. Observe output sections: metadata completeness, character limits, content rules, product consistency, entitlements, fastlane config, screenshot pipeline, build verification
3. **Expected:** All 30 checks show PASS. Exit code 0. Summary reads "30 passed, 0 failed".

### 2. en-US frameit strings are complete

1. Open `apps/mobile/fastlane/screenshots/en-US/keyword.strings`
2. Count entries (lines matching `"0x"`)
3. Repeat for `title.strings`
4. **Expected:** Both files have exactly 6 entries matching the Framefile.json filter numbers (01-06).

### 3. E2E runbook covers all required sections

1. Open `apps/mobile/fastlane/E2E_VERIFICATION.md`
2. Verify table of contents lists: Prerequisites, iOS Sandbox Testing, Android Test Track Testing, Screenshot Capture, Store Submission, Post-Submission
3. Check that iOS testing section includes purchase flow, restart persistence, restore, subscription expiry
4. Check that Screenshot Capture lists all 6 screens with filter numbers
5. Check that legal URL production blocker is prominently flagged
6. **Expected:** All sections present with actionable checklists and exact fastlane commands.

### 4. Runbook cross-references deployment workflow

1. Search `E2E_VERIFICATION.md` for "DEPLOYMENT_WORKFLOW.md"
2. **Expected:** At least one cross-reference to avoid duplicating lane documentation.

## Edge Cases

### Validation script with a deliberate failure

1. Temporarily rename one fastlane config file (e.g., `mv Appfile Appfile.bak`)
2. Run `bash apps/mobile/scripts/verify-s06-submission.sh`
3. **Expected:** Script reports FAIL for the missing config, exits non-zero with count showing 1 failed.
4. Restore file: `mv Appfile.bak Appfile`

## Failure Signals

- Validation script exits non-zero or reports any FAIL
- en-US strings files missing or have fewer than 6 entries
- E2E runbook missing any of the 6 required sections
- Product IDs in code don't match StoreKit configuration

## Requirements Proved By This UAT

- R024 (App Store / Play Store Optimization) — Validation tooling and submission documentation are complete and operational.

## Not Proven By This UAT

- Actual store submission (human-gated)
- Device-level purchase flow testing (human-gated, covered by E2E_VERIFICATION.md runbook)
- Screenshot quality and store listing visual review (human-gated)
- Legal page availability at fitlog.app/privacy and fitlog.app/terms

## Notes for Tester

The validation script runs `pnpm test` and `pnpm run build` as its final two checks — expect it to take 1-2 minutes. If those are known-good, you can verify the other 28 checks passed in the first few seconds of output.

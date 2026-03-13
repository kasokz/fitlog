---
id: T02
parent: S06
milestone: M003
provides:
  - Complete E2E verification runbook covering prerequisites, device testing, screenshot capture, store submission, and post-submission monitoring
key_files:
  - apps/mobile/fastlane/E2E_VERIFICATION.md
key_decisions:
  - Cross-references DEPLOYMENT_WORKFLOW.md for lane documentation instead of duplicating — keeps E2E doc focused on testing and verification steps
  - Legal URLs flagged as PRODUCTION BLOCKER with bold callout since Apple rejection here is near-certain
  - Included checklists (checkboxes) in iOS and Android testing sections for manual tracking during device testing
patterns_established:
  - Runbook structure with table-of-contents, per-platform testing checklists, and post-submission monitoring guidance
observability_surfaces:
  - none (documentation-only task)
duration: 12m
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T02: E2E verification runbook and store submission checklist

**Created comprehensive handoff runbook at `fastlane/E2E_VERIFICATION.md` covering environment setup, iOS sandbox testing, Android test track testing, screenshot capture with all 6 screens, exact fastlane submission commands, and post-submission monitoring.**

## What Happened

1. Gathered all input files: `.env.example` (env vars), `DEPLOYMENT_WORKFLOW.md` (existing docs to cross-reference), `Framefile.json` (6 screenshot filters), `purchase-plugin.ts` (3 product IDs + 2 plan IDs), `paywall-constants.ts` (legal URLs).
2. Wrote `E2E_VERIFICATION.md` with 6 major sections:
   - **Prerequisites**: env var table, 3 product configurations for both stores, StoreKit config in Xcode, Android keystore generation, legal URLs as production blocker
   - **iOS Sandbox Testing**: purchase flow, restart persistence (revalidatePurchases), restore, subscription management, subscription expiry via StoreKit Transaction Manager
   - **Android Test Track Testing**: closed testing setup, purchase with acknowledgement verification, restart persistence, restore
   - **Screenshot Capture**: all 6 screens with filter numbers, naming convention, required resolutions per device type (iOS: 4 sizes, Android: 3 types), frameit commands, locale verification
   - **Store Submission**: exact fastlane commands for both platforms, metadata upload, promotion pipeline, recommended submission order
   - **Post-Submission**: common Apple rejection reasons table, monitoring guidance for both store dashboards, rejection handling workflow
3. Cross-referenced `DEPLOYMENT_WORKFLOW.md` twice (intro + submission section) to avoid duplicating lane documentation.

## Verification

- File exists at expected path: PASS
- All 6 required sections present: PASS
- All 6 screenshot filters (01-06) listed with descriptions: PASS
- Legal URL production blocker flagged prominently: PASS
- Exact fastlane commands for both platforms present: PASS
- Cross-references DEPLOYMENT_WORKFLOW.md: PASS
- Product IDs referenced: PASS
- Purchase lifecycle covered (restart persistence, restore, expiry, acknowledgement): PASS
- Pre-submission validation script (`verify-s06-submission.sh`): 30/30 checks pass

### Slice-level verification status

- ✅ `bash apps/mobile/scripts/verify-s06-submission.sh` — 30 passed, 0 failed
- ✅ `pnpm test` — passes (run inside validation script)
- ✅ `pnpm run build` — succeeds (run inside validation script)
- ✅ `en-US/keyword.strings` and `title.strings` exist with 6 entries each
- ✅ `apps/mobile/fastlane/E2E_VERIFICATION.md` exists with purchase lifecycle and submission sections

## Diagnostics

None — documentation-only task. The runbook itself is the diagnostic guide for human testers.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/fastlane/E2E_VERIFICATION.md` — Complete E2E verification runbook with 6 sections, testing checklists, screenshot requirements, and store submission commands

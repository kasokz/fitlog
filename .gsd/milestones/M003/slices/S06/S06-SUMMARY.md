---
id: S06
parent: M003
milestone: M003
provides:
  - 30-check pre-submission validation script covering metadata, character limits, product consistency, entitlements, frameit pipeline, and build
  - en-US frameit keyword.strings and title.strings (6 entries each, matching Framefile.json filters)
  - Comprehensive E2E verification runbook covering prerequisites, iOS sandbox testing, Android test track testing, screenshot capture, store submission, and post-submission monitoring
requires:
  - slice: S01
    provides: PurchasePlugin wrapper with PRODUCT_IDS constants
  - slice: S02
    provides: Premium service with revalidation and persistence
  - slice: S03
    provides: Paywall UI, legal URLs, subscription terms
  - slice: S04
    provides: Premium templates with premium flag
  - slice: S05
    provides: Fastlane config, store metadata (40 files), frameit pipeline
affects:
  - S07 (i18n sync — can proceed independently)
key_files:
  - apps/mobile/scripts/verify-s06-submission.sh
  - apps/mobile/fastlane/screenshots/en-US/keyword.strings
  - apps/mobile/fastlane/screenshots/en-US/title.strings
  - apps/mobile/fastlane/E2E_VERIFICATION.md
key_decisions:
  - Validation script checks 30 conditions (exceeding 20+ requirement) with bidirectional product ID consistency
  - Runbook cross-references DEPLOYMENT_WORKFLOW.md for lane docs instead of duplicating
  - Legal URLs flagged as PRODUCTION BLOCKER in runbook since Apple rejection is near-certain without them
patterns_established:
  - Validation script pattern with pass/fail/section functions, colored output, and summary exit code
  - Runbook structure with table-of-contents, per-platform testing checklists, and post-submission monitoring guidance
observability_surfaces:
  - bash apps/mobile/scripts/verify-s06-submission.sh — colored PASS/FAIL per check with summary count (30 checks)
drill_down_paths:
  - .gsd/milestones/M003/slices/S06/tasks/T01-SUMMARY.md
  - .gsd/milestones/M003/slices/S06/tasks/T02-SUMMARY.md
duration: 27m
verification_result: passed
completed_at: 2026-03-13
---

# S06: End-to-End Integration & Store Submission

**Pre-submission validation script (30 checks, all green) and comprehensive E2E verification runbook ready for human-gated device testing and store submission.**

## What Happened

Built the final assembly layer for M003's store submission pipeline. T01 created en-US frameit strings (keyword.strings and title.strings, 6 entries each matching Framefile.json filters) and a 30-check validation script organized in 7 sections: metadata completeness, character limits, content rules (no emojis, health rating), product ID consistency (bidirectional code-to-StoreKit checks), entitlements, fastlane config, screenshot pipeline, and build verification. T02 produced the E2E verification runbook with 6 major sections covering environment prerequisites, iOS sandbox purchase testing (with checklists), Android test track testing, screenshot capture workflow for all 6 screens across device sizes, exact fastlane submission commands, and post-submission monitoring with common Apple rejection reasons.

## Verification

- `bash apps/mobile/scripts/verify-s06-submission.sh` — 30 passed, 0 failed, exit 0
- `pnpm test` — passes (run inside validation script)
- `pnpm run build` — succeeds (run inside validation script)
- en-US `keyword.strings` and `title.strings` exist with 6 entries each
- `apps/mobile/fastlane/E2E_VERIFICATION.md` exists with all 6 required sections (Prerequisites, iOS Sandbox Testing, Android Test Track Testing, Screenshot Capture, Store Submission, Post-Submission)

## Requirements Advanced

- R024 (App Store / Play Store Optimization) — Validation script ensures metadata completeness, character limits, no emojis, and config consistency before submission. Runbook documents the full submission pipeline.
- R020 (IAP Infrastructure) — Product ID consistency validated bidirectionally (code ↔ StoreKit). Entitlement presence confirmed.

## Requirements Validated

- None — this slice produces validation tooling and documentation. Actual store submission and device testing are human-gated.

## New Requirements Surfaced

- None

## Requirements Invalidated or Re-scoped

- None

## Deviations

Validation script has 30 checks instead of the planned 20+ minimum — bidirectional product ID consistency (3 code→StoreKit + 3 StoreKit→code) provided stronger validation than originally scoped.

## Known Limitations

- Legal URLs (`fitlog.app/privacy` and `fitlog.app/terms`) are placeholders — must be live before production store submission. Flagged as PRODUCTION BLOCKER in the runbook.
- Device testing and store submission are human-gated — the validation script and runbook prepare the path but a human must execute the actual flows.
- Screenshot assets are pipeline-ready (frameit configured) but actual device screenshots must be captured manually per the runbook.

## Follow-ups

- S07: i18n key sync for all new M003 UI text (de.json + en.json)
- Human execution of E2E_VERIFICATION.md runbook (device testing on both platforms)
- Deploy legal pages at fitlog.app/privacy and fitlog.app/terms before production submission

## Files Created/Modified

- `apps/mobile/scripts/verify-s06-submission.sh` — 30-check pre-submission validation script with colored output
- `apps/mobile/fastlane/screenshots/en-US/keyword.strings` — English keyword strings for 6 screenshot entries
- `apps/mobile/fastlane/screenshots/en-US/title.strings` — English title strings for 6 screenshot entries
- `apps/mobile/fastlane/E2E_VERIFICATION.md` — Complete E2E verification runbook with 6 sections

## Forward Intelligence

### What the next slice should know
- S07 is i18n-only work — no new code or config, just key synchronization. The validation script does NOT check i18n key counts, so S07 completion is independent.
- All M003 code is now feature-complete. After S07, the milestone is blocked only on human-gated work (device testing + store submission).

### What's fragile
- Legal placeholder URLs — Apple will reject without live pages. The runbook flags this prominently but it's easy to miss in the rush to submit.
- StoreKit testing config requires manual Xcode scheme selection — not automatable, easy to forget when switching between debug/release.

### Authoritative diagnostics
- `bash apps/mobile/scripts/verify-s06-submission.sh` — single command validates all pre-submission prerequisites. Run before any store interaction.

### What assumptions changed
- No assumptions changed. This slice was documentation and validation only, as planned.

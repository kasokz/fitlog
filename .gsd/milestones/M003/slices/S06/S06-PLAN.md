# S06: End-to-End Integration & Store Submission

**Goal:** All store submission prerequisites are validated, the screenshot pipeline is complete for both locales, and a comprehensive runbook guides the human through device testing and store submission.
**Demo:** Running `bash scripts/verify-s06-submission.sh` passes all automated checks. The en-US frameit strings exist. A step-by-step runbook in `fastlane/E2E_VERIFICATION.md` covers every device test and submission step.

## Must-Haves

- Automated validation script checking metadata completeness, product ID consistency, entitlements, character limits, no emojis, build success
- en-US `keyword.strings` and `title.strings` for frameit screenshot pipeline
- E2E verification runbook covering: sandbox purchase flow (iOS + Android), persistence across restart, restore purchases, subscription expiry, screenshot capture, and store submission via fastlane
- All existing tests still pass, build still succeeds

## Proof Level

- This slice proves: final-assembly
- Real runtime required: yes (human-gated — device testing and store submission)
- Human/UAT required: yes

## Verification

- `bash apps/mobile/scripts/verify-s06-submission.sh` — all automated pre-submission checks pass
- `pnpm test` — 428+ tests pass
- `pnpm run build` — succeeds
- `apps/mobile/fastlane/screenshots/en-US/keyword.strings` and `title.strings` exist with 6 entries each
- `apps/mobile/fastlane/E2E_VERIFICATION.md` exists with purchase lifecycle and submission sections

## Integration Closure

- Upstream surfaces consumed: S01 plugin wrapper (PRODUCT_IDS), S02 premium service (revalidation, persistence), S03 paywall (legal URLs, subscription terms), S04 templates (premium flag), S05 fastlane config + metadata (40 files)
- New wiring introduced in this slice: none — validation and documentation only
- What remains before the milestone is truly usable end-to-end: S07 (i18n key sync), then human execution of the runbook (device testing + store submission)

## Tasks

- [x] **T01: Pre-submission validation script and en-US frameit strings** `est:45m`
  - Why: Catches metadata, configuration, and consistency errors before the human touches App Store Connect or Google Play Console. Closes the en-US frameit strings gap that would break English screenshot framing.
  - Files: `apps/mobile/scripts/verify-s06-submission.sh`, `apps/mobile/fastlane/screenshots/en-US/keyword.strings`, `apps/mobile/fastlane/screenshots/en-US/title.strings`
  - Do: (1) Create en-US keyword.strings and title.strings with English marketing text matching the 6 Framefile entries. (2) Build a comprehensive shell script that validates: metadata file counts (iOS >= 20, Android >= 8), character limits (subtitle <= 30, keywords <= 100, Android title <= 30, short_description <= 80), no emojis in any metadata file, PRODUCT_IDS in code match Products.storekit, IAP entitlement in App.entitlements, all 5 fastlane config files present, frameit strings exist for both locales with 6 entries each, review_information files present, age_rating_declaration.json has healthOrWellnessTopics, Appfile references com.fitlog.app, pnpm test passes, pnpm run build succeeds. (3) Script exits 0 only if all checks pass, with clear per-check PASS/FAIL output.
  - Verify: `bash apps/mobile/scripts/verify-s06-submission.sh` exits 0 with all checks passing
  - Done when: Script validates 20+ checks covering metadata, config, product consistency, and build — all passing green

- [x] **T02: E2E verification runbook and store submission checklist** `est:30m`
  - Why: The human needs a precise, step-by-step guide for device testing and store submission — this is the handoff document that makes the human-gated work executable without context loss.
  - Files: `apps/mobile/fastlane/E2E_VERIFICATION.md`
  - Do: Write a comprehensive runbook covering: (1) Prerequisites — env var setup from .env.example, Apple/Google Console product configuration, StoreKit config selection in Xcode scheme, Google Play closed testing track setup. (2) iOS sandbox testing — purchase annual/monthly subscription, verify unlock, restart app and verify persistence, restore purchases on fresh install, verify subscription expiry behavior. (3) Android test track testing — same flow adapted for Play Billing. (4) Screenshot capture — which 6 screens to capture, naming convention matching Framefile filters "01"-"06", how to run `fastlane frameit`. (5) Store submission — `fastlane ios deploy_internal`, `fastlane android deploy_internal`, metadata push commands. (6) Post-submission — what to monitor, common rejection reasons and fixes. Include the legal URL prerequisite prominently (fitlog.app/privacy and /terms must be live before production submission).
  - Verify: File exists with sections for prerequisites, iOS testing, Android testing, screenshots, submission, and post-submission
  - Done when: Runbook is comprehensive enough that a developer with store access can execute the full flow without additional context

## Files Likely Touched

- `apps/mobile/scripts/verify-s06-submission.sh`
- `apps/mobile/fastlane/screenshots/en-US/keyword.strings`
- `apps/mobile/fastlane/screenshots/en-US/title.strings`
- `apps/mobile/fastlane/E2E_VERIFICATION.md`

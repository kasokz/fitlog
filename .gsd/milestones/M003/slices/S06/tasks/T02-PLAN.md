---
estimated_steps: 3
estimated_files: 1
---

# T02: E2E verification runbook and store submission checklist

**Slice:** S06 — End-to-End Integration & Store Submission
**Milestone:** M003

## Description

Create a comprehensive handoff document that guides a developer through every human-gated step: environment setup, device testing of the full purchase lifecycle, screenshot capture, and store submission via fastlane. This document is the bridge between the agent's automated validation (T01) and the actual store submission.

## Steps

1. Write `apps/mobile/fastlane/E2E_VERIFICATION.md` with the following sections:
   - **Prerequisites** — env var setup (reference .env.example), App Store Connect product configuration (3 products with matching IDs and "Ready to Submit" status), Google Play Console closed testing track setup, StoreKit config selection in Xcode scheme, Android keystore creation if needed, legal pages (fitlog.app/privacy, fitlog.app/terms) must be live before production submission
   - **iOS Sandbox Testing** — step-by-step: run on device/simulator with StoreKit config, trigger paywall, purchase annual subscription, verify analytics unlock, verify template pack purchase, restart app and verify persistence (revalidatePurchases on launch), test restore purchases from settings, verify subscription management link, test subscription expiry (StoreKit allows manual expire in Xcode)
   - **Android Test Track Testing** — same flow adapted for Play Billing: ensure closed testing track exists with tester emails, install from internal track, purchase flow, verify acknowledgement, restart persistence, restore purchases
   - **Screenshot Capture** — list all 6 screens (01: active workout, 02: exercise library, 03: strength curves chart, 04: PR tracking, 05: program templates, 06: premium analytics), naming convention (filter string must appear in filename), required resolutions per device type, run `fastlane frameit` after placing raw screenshots, verify both de-DE and en-US output
   - **Store Submission** — exact fastlane commands: `fastlane ios deploy_internal` for TestFlight, `fastlane android deploy_internal` for internal track, `fastlane ios update_metadata` and `fastlane android update_metadata_internal` for metadata push, promotion steps from internal → closed → production
   - **Post-Submission** — common Apple rejection reasons for subscription apps (missing terms, legal URLs not loading, screenshots not matching app), what to monitor in App Store Connect and Google Play Console, how to iterate on rejections
2. Cross-reference DEPLOYMENT_WORKFLOW.md to avoid duplicating its content — link to it for detailed fastlane lane documentation, keep E2E_VERIFICATION.md focused on the testing and verification steps.
3. Review the document for completeness against the slice's roadmap description: "Full purchase lifecycle verified end-to-end on real devices — purchase, unlock, restart persistence, restore, subscription expiry. App submitted to App Store Connect and Google Play Console."

## Must-Haves

- [ ] Prerequisites section covers env vars, store console setup, legal URLs, and StoreKit config
- [ ] iOS sandbox testing section covers purchase, unlock, restart persistence, restore, and expiry
- [ ] Android testing section covers purchase, acknowledgement, restart persistence, and restore
- [ ] Screenshot section lists all 6 screens with naming convention and resolution requirements
- [ ] Store submission section has exact fastlane commands for both platforms
- [ ] Legal URL requirement is prominently flagged as a production blocker

## Verification

- File exists at `apps/mobile/fastlane/E2E_VERIFICATION.md`
- File contains sections: Prerequisites, iOS Sandbox Testing, Android Test Track Testing, Screenshot Capture, Store Submission, Post-Submission
- All 6 screenshot screens are listed with filter numbers

## Inputs

- `apps/mobile/fastlane/.env.example` — required environment variables
- `apps/mobile/fastlane/DEPLOYMENT_WORKFLOW.md` — existing deployment documentation to reference (not duplicate)
- `apps/mobile/fastlane/screenshots/Framefile.json` — screenshot filter definitions
- `apps/mobile/src/lib/services/purchase-plugin.ts` — PRODUCT_IDS for verification steps
- `apps/mobile/src/lib/components/premium/paywall-constants.ts` — legal URLs that must be live
- T01 output — validation script that should be run before submission

## Expected Output

- `apps/mobile/fastlane/E2E_VERIFICATION.md` — Complete runbook covering prerequisites, device testing, screenshot capture, store submission, and post-submission monitoring

# S06: End-to-End Integration & Store Submission — Research

**Date:** 2026-03-13

## Summary

S06 is the integration/verification slice — it doesn't build new features but verifies the full purchase lifecycle end-to-end on real devices and submits the app to both stores. The codebase is in strong shape: all purchase infrastructure (plugin wrapper, premium service, paywall drawer, revalidation on launch/resume), store metadata (40 files across iOS/Android in de+en), fastlane deployment config (Fastfile with all lanes, Appfile, Matchfile), and 428 passing tests are ready. The StoreKit testing config (`Products.storekit`) has all 3 products defined. iOS entitlements include IAP capability.

The primary challenge is that this slice is almost entirely **human-gated** — it requires physical devices, real App Store Connect / Google Play Console access, credential setup, and manual verification of native purchase flows. The agent's role is limited to: (1) creating a verification checklist/script that documents exactly what to test, (2) ensuring screenshots can be captured and placed in the right directories, (3) validating all metadata and configuration are complete before submission, and (4) any last-mile code fixes discovered during the verification process.

Key concern: S05's forward intelligence notes that legal URLs (`fitlog.app/privacy`, `fitlog.app/terms`) are placeholder domains. Apple will reject if these pages don't exist at review time. This is a hard prerequisite for production submission, though sandbox testing can proceed without them.

## Recommendation

**Approach:** Split into three tasks:

1. **Pre-submission verification checklist + automated validation script** — A task the agent can fully own. Create a comprehensive shell script that validates all metadata files (character limits, no emojis, required files present), confirms the StoreKit config matches PRODUCT_IDS, checks entitlements, verifies fastlane config integrity, and runs the full test suite + build. This catches problems before the human touches App Store Connect.

2. **Screenshot capture guidance + directory setup** — Document exact screens to capture matching the Framefile filters "01"-"06". Ensure directory structure is correct for `fastlane frameit`. Create the locale-specific screenshot directories for en-US. This is partially agent-automatable (directory setup, documentation) but screenshot capture itself requires running the app on a device.

3. **Store submission execution** — Fully human-gated. Execute `fastlane ios deploy_internal` and `fastlane android deploy_internal` to push builds, then `fastlane ios update_metadata` and `fastlane android update_metadata_internal` to push metadata. Promote through testing tracks. The agent can prepare a step-by-step runbook but cannot execute the store credential-dependent steps.

The agent should focus effort on task 1 (automated validation) and task 2 (screenshot pipeline readiness), since task 3 is entirely credential- and device-dependent.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| iOS build + TestFlight upload | `fastlane ios deploy_internal` lane (Fastfile line 584) | Complete lane: version from git tag, build number from TestFlight, cap sync, build, upload. Production-proven from yahtzee reference. |
| Android build + internal track upload | `fastlane android deploy_internal` lane (Fastfile line 1387) | AAB build with signed keystore, auto-increment version code, upload to internal track. |
| iOS metadata push | `fastlane ios update_metadata` lane (Fastfile line 1239) | Pushes all metadata/ios/ files to App Store Connect via `deliver`. Includes age rating, screenshots. |
| Android metadata push | `fastlane android update_metadata_internal` lane (Fastfile line 2038) | Pushes metadata/android/ to Play Console internal track via `supply`. |
| Screenshot framing | `fastlane frameit` with Framefile.json configs | Both iOS and Android Framefile.json already configured with 6 entries, fonts, and background. |
| iOS certificate management | `fastlane ios certificates_appstore` + match | Matchfile configured for `com.fitlog.app`, git storage, appstore type. |
| Purchase verification on launch | `revalidatePurchases()` in `+layout.svelte` | Already fires on mount and `resume` event. No additional wiring needed. |
| Sandbox testing products | `Products.storekit` | 3 products (annual, monthly, template pack) with de+en localizations, DEU storefront. |

## Existing Code and Patterns

- `apps/mobile/fastlane/Fastfile` — 2309 lines with complete iOS and Android deployment automation. Lanes for internal testing, promotion to production, metadata upload, screenshot capture. All lanes read app identifier from Appfile (no hardcoded values).
- `apps/mobile/fastlane/Appfile` — `com.fitlog.app` for both iOS and Android. Credentials via env vars.
- `apps/mobile/fastlane/.env.example` — Documents all required env vars: Apple ID, team IDs, API key path, match config, Android keystore, Google Play service account.
- `apps/mobile/fastlane/DEPLOYMENT_WORKFLOW.md` — Complete step-by-step deployment guide. iOS: build → TestFlight → production. Android: build → internal → closed → production.
- `apps/mobile/fastlane/metadata/ios/` — 28 files: 9 localized per locale (de-DE, en-US), copyright, primary_category, age_rating_declaration.json, 7 review_information files.
- `apps/mobile/fastlane/metadata/android/` — 12 files: title, short_description, full_description, changelog per locale (de-DE, en-US), plus screenshot placeholders.
- `apps/mobile/fastlane/screenshots/Framefile.json` — iOS frameit config: 6 screens (workout, exercises, strength curves, PRs, programs, premium analytics) with title/keyword text.
- `apps/mobile/fastlane/metadata/android/Framefile.json` — Android frameit config mirroring iOS.
- `apps/mobile/ios/App/App/Products.storekit` — StoreKit testing config with 3 products matching PRODUCT_IDS exactly: `com.fitlog.app.premium.annual` (P1Y, €29.99), `com.fitlog.app.premium.monthly` (P1M, €3.99), `com.fitlog.app.templates.pack` (NonConsumable, €4.99).
- `apps/mobile/ios/App/App/App.entitlements` — In-App Purchase entitlement enabled.
- `apps/mobile/src/lib/services/purchase-plugin.ts` — Complete plugin wrapper: `isBillingSupported`, `getProducts`, `getProduct`, `purchaseProduct`, `getPurchases`, `restorePurchases`, `manageSubscriptions`. All web-safe with D073 catch-and-return pattern.
- `apps/mobile/src/lib/services/premium.ts` — Granular product tracking: `PurchasedProduct` map, `isTransactionActive()` with platform branching, `revalidatePurchases()` with web no-op (D078), `grantPurchase()`, `canAccessFeature()` with feature-to-product mapping.
- `apps/mobile/src/lib/components/premium/PaywallDrawer.svelte` — Complete paywall: dynamic product loading, per-product purchase buttons, subscription terms, legal links, restore purchases, loading/error states.
- `apps/mobile/src/routes/settings/+page.svelte` — Subscription management section with current plan display, restore purchases, manage subscription link. Dev-only IAP test section for sandbox testing.
- `apps/mobile/src/routes/+layout.svelte` — Revalidation on mount (after onboarding check) and on `resume` event. Fire-and-forget pattern.
- `apps/mobile/src/lib/components/premium/paywall-constants.ts` — Legal URLs: `fitlog.app/privacy`, `fitlog.app/terms`. Comments marked "finalized for store submission."

## Constraints

- **Human-gated work:** Store submission requires App Store Connect and Google Play Console credentials, physical devices for sandbox testing, and manual approval of screenshots. The agent cannot execute `fastlane deliver` or `fastlane supply` without env vars.
- **Legal URLs must exist before production submission:** `fitlog.app/privacy` and `fitlog.app/terms` are referenced in the paywall and store metadata. Apple and Google will follow these links during review. Sandbox testing is fine without them, but production submission will be rejected.
- **Google Play requires closed testing track before IAP testing:** Google Play Billing won't return products without at least one closed testing track with real testers. This is a prerequisite for Android e2e testing.
- **StoreKit config requires manual Xcode scheme selection:** The `Products.storekit` file must be selected in Xcode scheme → Run → Options → StoreKit Configuration for simulator testing. Not automatable in headless builds.
- **Screenshots must match Framefile filter naming:** iOS screenshots use filters "01" through "06". Files must be named to include these filter strings (e.g., `01_workout.png`). Both de-DE and en-US directories need locale-appropriate screenshots.
- **App Store Connect requires products to be configured before production:** StoreKit config works for sandbox, but real products must be created in App Store Connect for production. Products need status "Ready to Submit" before app review.
- **Android keystore is a one-time creation:** If not yet created, a release keystore must be generated. Loss of keystore = cannot update app on Play Store. Backup is critical.
- **428 tests pass, build succeeds** — No pre-existing test or build failures to address.
- **i18n: 367 lines each in de.json and en.json** — Synchronized, no drift.
- **No emojis in store metadata** — AGENTS.md constraint. Already enforced in S05 metadata files.

## Common Pitfalls

- **Forgetting to create App Store Connect products before submission** — StoreKit config works for local sandbox testing, but Apple review requires real products configured in App Store Connect with matching product IDs (`com.fitlog.app.premium.annual`, `.monthly`, `.templates.pack`). Reviewer will reject if products aren't in "Ready to Submit" state.
- **Screenshot resolution mismatch** — App Store requires specific resolutions for each device type (6.7" = 1290×2796, 6.5" = 1284×2778, etc.). Using wrong sizes causes upload rejection. Frameit helps but input screenshots must be correct native resolution.
- **Missing en-US screenshot keyword/title .strings** — `apps/mobile/fastlane/screenshots/en-US/` only has `.gitkeep`. Frameit requires `keyword.strings` and `title.strings` per locale. English versions need to be created.
- **Android build signing without keystore** — First Android build requires creating and configuring a release keystore. The `.env.example` documents the env vars but the keystore file itself must be generated with `keytool`.
- **Submitting before legal pages exist** — `fitlog.app/privacy` and `fitlog.app/terms` must be live web pages before store review. Not just URLs in metadata — Apple's review team actually visits them.
- **Not acknowledging Android purchases** — Google Play Billing requires acknowledging purchases within 3 days or they're automatically refunded. The `@capgo/native-purchases` plugin should handle this, but it should be verified during e2e testing.
- **Apple review rejection for screenshots not matching app** — Screenshots must show the actual app UI, not mockups. If the app looks different from screenshots, reviewers reject. Capture from a real device running the final build.

## Open Risks

- **Legal page availability** — `fitlog.app` domain may not have privacy/terms pages deployed. This blocks production submission (not sandbox testing). The user needs to host these pages before Apple/Google review.
- **First submission rejection probability** — Apple frequently rejects first subscription apps. The review notes are thorough (review_information/notes.txt explains both purchase types), restore purchases is accessible from settings, subscription terms are in paywall. But there may be unexpected requirements.
- **Android closed testing track prerequisite** — If no closed testing track exists in Google Play Console, IAP testing on Android cannot proceed. This requires manual Console setup with at least one tester email.
- **Screenshot capture complexity** — 6 screens × 2 locales × 2 platforms = 24 screenshot files. Capturing all with appropriate test data in the app (workouts, PRs, analytics) requires seeded data. The app's current seed has 55 exercises but no workout history — screenshots showing analytics/PRs need manual workout data.
- **Frameit en-US strings missing** — `screenshots/en-US/` only has `.gitkeep`. English `keyword.strings` and `title.strings` files need to be created to match the de-DE ones for frameit to produce English-framed screenshots.

## Skills Discovered

| Technology | Skill | Status | Recommendation |
|------------|-------|--------|----------------|
| Capacitor best practices | `cap-go/capacitor-skills@capacitor-best-practices` | available (296 installs) | Relevant for ensuring native project config is correct before submission |
| Capacitor App Store | `cap-go/capacitor-skills@capacitor-app-store` | available (78 installs) | Directly relevant — covers store submission for Capacitor apps |
| App Store readiness | `eddiebe147/claude-settings@appstore-readiness` | available (85 installs) | Covers App Store review checklist items |
| iOS submission | `kimny1143/claude-code-template@ios-app-store-submission` | available (54 installs) | iOS-specific submission guidance |
| Fastlane expert | `willsigmon/sigstack@fastlane expert` | available (14 installs) | Low install count, skip |

## Sources

- Existing codebase: fastlane configuration (Fastfile, Appfile, Matchfile, .env.example, DEPLOYMENT_WORKFLOW.md)
- Existing codebase: store metadata files (40 files across iOS/Android, de-DE/en-US)
- Existing codebase: StoreKit testing config (Products.storekit with 3 products)
- Existing codebase: purchase infrastructure (purchase-plugin.ts, premium.ts, PaywallDrawer.svelte)
- Existing codebase: screenshot pipeline (Framefile.json for iOS and Android, fonts, background)
- S05 forward intelligence: legal URLs are placeholder, Framefile expects filters "01"-"06", DEPLOYMENT_WORKFLOW.md documents full flow
- S04 forward intelligence: 8 templates (3 free + 5 premium), template names are English strings
- M003 research: Apple review requirements for subscriptions, Google Play closed testing prerequisite, Android purchase acknowledgement requirement

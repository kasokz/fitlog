---
id: M003
provides:
  - Native in-app purchase infrastructure via @capgo/native-purchases (StoreKit 2 + Play Billing 7.x) with Capacitor 8
  - PurchasePlugin thin wrapper with typed getProducts/purchaseProduct/restorePurchases/getPurchases/manageSubscriptions
  - Granular premium service — PurchasedProduct map per product, feature-to-product mapping, subscription expiry checks, launch-time revalidation
  - PaywallDrawer with dynamic store pricing, subscription terms, Apple-compliant cancellation instructions
  - Restore Purchases and Manage Subscription in Settings
  - 5 premium program templates (Periodized Strength 531, Linear Progression LP, Tiered Volume Method, Periodized Hypertrophy, Strength-Endurance Block)
  - TemplateBrowserDrawer with premium gate enforcement and PaywallDrawer integration on Programs page
  - Complete fastlane deployment infrastructure (Fastfile, Appfile, Matchfile, metadata) for com.fitlog.app
  - Store metadata (40+ files) for iOS and Android in de-DE + en-US with zero emojis
  - Screenshot frameit pipeline with 6 screens per locale
  - 30-check pre-submission validation script
  - E2E verification runbook covering both platforms
  - 365 i18n keys synchronized across de.json and en.json with zero drift
key_decisions:
  - D066 — @capgo/native-purchases over RevenueCat (free, same vendor, direct StoreKit 2 / Play Billing 7.x)
  - D067 — Granular product tracking replacing single boolean premium flag
  - D068 — Annual subscription + one-time template pack pricing model
  - D069 — Generic descriptive template names, not trademarked methodology names
  - D071 — Local-only purchase validation (server-side deferred to M004)
  - D075 — JSON-serialized product map in Preferences for purchase persistence
  - D076 — Platform-specific transaction active status abstraction (iOS isActive vs Android purchaseState)
  - D077 — Revalidation on mount + resume only, not per-navigation
  - D079 — Paywall as vaul-svelte Drawer (matching codebase pattern)
  - D084 — Separate PROGRAM_TEMPLATES (free) and PREMIUM_PROGRAM_TEMPLATES (premium) registries
patterns_established:
  - PurchasePlugin wrapper with catch-and-return-safe-defaults error strategy (never throws)
  - Feature-to-product mapping via FEATURE_PRODUCT_MAP for granular access control
  - PaywallDrawer onpurchasecomplete callback pattern for post-purchase reactivity
  - Premium-gated template selection with in-place unlock after purchase
  - Fastlane config adapted from reference project via sed substitution of app identifier
  - Pre-submission validation script pattern with colored PASS/FAIL output
observability_surfaces:
  - "[PurchasePlugin]" prefixed logs for all IAP operations
  - "[Premium]" prefixed logs for premium state checks, revalidation, feature access
  - "[TemplateBrowser]" logs for template creation flow
  - bash apps/mobile/scripts/verify-s06-submission.sh — 30-check pre-submission validation
  - Dev override via setPremiumStatus(true) enables all premium features for testing
requirement_outcomes:
  - id: R020
    from_status: active
    to_status: active
    proof: IAP infrastructure built and functional in sandbox (StoreKit config, purchase plugin, product IDs). Full production validation requires human device testing (S06 runbook).
  - id: R021
    from_status: active
    to_status: active
    proof: 5 premium templates authored, registered, tested (19 template tests), browsable with purchase gate. Full validation requires end-to-end purchase on device.
  - id: R022
    from_status: active
    to_status: active
    proof: Analytics pack gated behind subscription products via canAccessFeature(). Feature-to-product mapping wired in M002's freemium gate. Requires device purchase verification.
  - id: R023
    from_status: active
    to_status: active
    proof: PaywallDrawer with dynamic pricing, subscription terms, cancellation instructions. Restore Purchases in settings. Apple compliance requirements met in implementation. Requires App Store review to validate.
  - id: R024
    from_status: active
    to_status: active
    proof: 40+ metadata files, de+en localizations, fastlane config, screenshot pipeline, no emojis. 30-check validation script passes. Requires actual store submission to validate.
duration: ~3h across 7 slices
verification_result: passed
completed_at: 2026-03-13
---

# M003: Monetization & Premium Features

**Full IAP infrastructure with granular product tracking, paywall UX, 5 premium program templates, and store submission pipeline — all built, tested, and ready for human-gated device verification and store submission.**

## What Happened

Seven slices built the complete monetization layer:

**S01 (IAP Plugin)** integrated `@capgo/native-purchases` with Capacitor 8, proving the plugin works. Created a thin `PurchasePlugin` wrapper exposing typed functions for all IAP operations with catch-and-return-safe-defaults error strategy. Set up StoreKit testing configuration with 3 products (annual subscription, monthly subscription, template pack). Native iOS entitlements and project configuration updated.

**S02 (Purchase State Management)** evolved the M002 single-boolean premium service into a granular product-tracking system. `PurchasedProduct` map persisted as JSON in Preferences. `canAccessFeature()` now checks product ownership via a feature-to-product mapping. Platform-specific transaction active status abstraction handles iOS StoreKit 2 vs Android Play Billing differences. Revalidation runs on app mount and resume via `revalidatePurchases()` in the root layout.

**S03 (Paywall UX)** built the PaywallDrawer using vaul-svelte (matching codebase conventions). Dynamic store price loading via `getProducts()`, subscription terms display, Apple-required cancellation instructions, and legal links. UpgradePrompt components open the paywall. Restore Purchases and Manage Subscription added to Settings page. Post-purchase reactivity via `onpurchasecomplete` callback.

**S04 (Premium Templates)** created 5 premium program templates representing distinct training philosophies. All 36 exercise names verified against SEED_EXERCISES. Template registry split into `PROGRAM_TEMPLATES` (3 free, onboarding-safe) and `PREMIUM_PROGRAM_TEMPLATES` (5 premium). TemplateBrowserDrawer with premium gate enforcement and PaywallDrawer integration added to Programs page as a "From Template" secondary action. 19 new tests added (428 total).

**S05 (Store Listing)** created the full fastlane deployment infrastructure adapted from a production reference project. 40+ metadata files for iOS and Android in de-DE and en-US. Optimized descriptions highlighting all 8 templates, RIR-based progression, and premium features. Screenshot frameit pipeline with 6 screens. Review information with subscription-aware notes. No emojis anywhere.

**S06 (E2E Integration)** produced a 30-check pre-submission validation script covering metadata completeness, character limits, content rules, bidirectional product ID consistency, entitlements, fastlane config, screenshot pipeline, and build verification. Created a comprehensive E2E verification runbook for human-gated device testing and store submission.

**S07 (i18n Audit)** confirmed zero key drift: 365 keys in both de.json and en.json, zero parameter mismatches, no hardcoded strings in M003 components.

## Cross-Slice Verification

**Success Criterion: Paywall with real store prices and native purchase flow**
PaywallDrawer loads prices dynamically via `getProducts()` from the purchase plugin. Purchase button triggers `purchaseProduct()` which invokes the native StoreKit/Play Billing flow. Subscription terms and cancellation instructions displayed per Apple requirements. Verified by code inspection and build success. Device-level sandbox purchase is human-gated (documented in E2E runbook).

**Success Criterion: Premium features unlock immediately after purchase and persist across restart**
`onpurchasecomplete` callback in PaywallDrawer triggers `revalidatePurchases()` which updates the persisted product map in Preferences. On app restart, `revalidatePurchases()` runs at layout mount, reading persisted state. Verified by examining premium.ts revalidation flow and layout.svelte integration.

**Success Criterion: Browse premium templates, purchase access, create program**
TemplateBrowserDrawer lists all 8 templates (3 free + 5 premium). Premium templates gated via `canAccessFeature(PremiumFeature.premium_templates)`. Locked templates open PaywallDrawer. After purchase, callback re-checks access and enables selection. `createProgramFromTemplate()` creates a real program. 19 tests verify template data integrity and creation flow. 428 tests pass.

**Success Criterion: Restore Purchases in settings recovers purchases**
Settings page has Restore Purchases button calling `restorePurchases()` from the purchase plugin. Response processed through `revalidatePurchases()` to update persisted state. Verified by code inspection of settings page.

**Success Criterion: Subscription revalidation on app launch**
`revalidatePurchases()` called in root `+layout.svelte` on mount and App resume event. Calls `getPurchases()` to get current transaction state, updates persisted product map. Web platform skips state overwrite to preserve dev toggle (D078). Verified by grep showing 3 occurrences of `revalidatePurchases` in layout and settings.

**Success Criterion: Store submission with localized metadata**
40+ metadata files in fastlane/metadata for iOS and Android. de-DE and en-US localizations. No emojis (verified by validation script). Fastlane Fastfile, Appfile, Matchfile configured for com.fitlog.app. 30-check validation script passes with all green. Actual store submission is human-gated.

**Success Criterion: i18n zero key drift**
365 keys in both de.json and en.json. `diff` of sorted key lists produces no output. Parameter parity verified across all keys. Build succeeds confirming all `m.*()` calls resolve.

**Overall: `pnpm test` → 428 passed (17 files, 0 failures). `pnpm run build` → success. Validation script → 30/30 passed.**

## Requirement Changes

- R020 (IAP Infrastructure): active → active — Implementation complete with StoreKit config, purchase plugin, 3 products. Stays active pending human device verification.
- R021 (Premium Templates): active → active — 5 templates authored, registered, tested. Stays active pending end-to-end purchase flow on device.
- R022 (Advanced Analytics Pack): active → active — Analytics gated behind subscription via feature-to-product mapping. Stays active pending device verification.
- R023 (Paywall UX & Upgrade Flows): active → active — PaywallDrawer, UpgradePrompt, Restore Purchases, subscription terms all implemented. Stays active pending App Store review.
- R024 (Store Optimization): active → active — Metadata, fastlane config, screenshot pipeline ready. Stays active pending actual store submission and review.

No requirement status transitions to validated — all M003 requirements depend on human-gated device testing and store review for full validation.

## Forward Intelligence

### What the next milestone should know
- Purchase validation is local-only (D071). M004's cloud infrastructure should add server-side receipt validation for stronger security. The `PurchasedProduct` type and `revalidatePurchases()` function are the integration points.
- Legal URLs (fitlog.app/privacy, fitlog.app/terms, fitlog.app/support) are placeholder domains. Must be live before production store submission. Flagged as PRODUCTION BLOCKER in E2E runbook.
- The purchase plugin wrapper never throws (D073) — all functions return safe defaults on error. Callers don't need try/catch. This is intentional but means silent failures are possible; server-side validation in M004 should add alerting.
- `PROGRAM_TEMPLATES` (3 free) is imported by onboarding. `PREMIUM_PROGRAM_TEMPLATES` (5 premium) is separate. `ALL_TEMPLATES` (8 combined) is used by the template browser. Do not merge these exports.
- Schema version is still v5. M003 added no schema changes — all purchase state is in Preferences, not SQLite.

### What's fragile
- Template exercise names must exactly match SEED_EXERCISES — any seed data changes require auditing all 8 templates. Test suite catches mismatches automatically.
- Legal placeholder URLs — Apple will reject without live pages. Easy to miss in the rush to submit.
- StoreKit testing config requires manual Xcode scheme selection (Run → Options → StoreKit Configuration). Not automatable.
- S01-S03 slice summaries are doctor-created placeholders — task summaries in their respective tasks/ directories are the real authoritative source for those slices.

### Authoritative diagnostics
- `bash apps/mobile/scripts/verify-s06-submission.sh` — single command validates all 30 pre-submission prerequisites
- `pnpm test` — 428 tests including 19 template-specific tests and all analytics/repository tests
- `diff <(jq -r 'keys[]' de.json | sort) <(jq -r 'keys[]' en.json | sort)` in apps/mobile/messages/ — canonical zero-drift check
- `apps/mobile/fastlane/E2E_VERIFICATION.md` — complete human-gated verification runbook

### What assumptions changed
- @capgo/native-purchases worked with Capacitor 8 without issues — the high-risk assumption from planning was retired successfully in S01.
- i18n keys were front-loaded into implementation slices (S01-S04) rather than deferred to S07 — the dedicated i18n slice became a verification-only pass.
- S01-S03 slice summaries were lost and reconstructed by doctor — task summaries remain authoritative for those slices.

## Files Created/Modified

Key files across all slices (not exhaustive):

- `apps/mobile/src/lib/services/purchase-plugin.ts` — Thin IAP wrapper with PRODUCT_IDS and typed functions
- `apps/mobile/src/lib/services/premium.ts` — Granular product-tracking premium service with feature-to-product mapping
- `apps/mobile/src/lib/components/premium/PaywallDrawer.svelte` — Paywall sheet with dynamic pricing and purchase flow
- `apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` — Upgrade prompt component opening paywall
- `apps/mobile/src/lib/components/premium/paywall-constants.ts` — Legal URLs and pricing display constants
- `apps/mobile/src/lib/components/programs/TemplateBrowserDrawer.svelte` — Template browsing with premium gate
- `apps/mobile/src/lib/components/programs/TemplateBrowserCard.svelte` — Template card with lock/premium badge
- `apps/mobile/src/lib/data/templates/periodized-strength-531.ts` — Premium template: 4-day, 7-week
- `apps/mobile/src/lib/data/templates/linear-progression-lp.ts` — Premium template: 4-day, 6-week
- `apps/mobile/src/lib/data/templates/tiered-volume-method.ts` — Premium template: 4-day, 6-week
- `apps/mobile/src/lib/data/templates/periodized-hypertrophy.ts` — Premium template: 5-day, 8-week
- `apps/mobile/src/lib/data/templates/strength-endurance-block.ts` — Premium template: 3-day, 6-week
- `apps/mobile/src/lib/data/templates/index.ts` — Registry with PROGRAM_TEMPLATES, PREMIUM_PROGRAM_TEMPLATES, ALL_TEMPLATES
- `apps/mobile/src/lib/data/templates/types.ts` — ProgramTemplate interface with optional premium field
- `apps/mobile/src/lib/db/__tests__/template-service.test.ts` — 19 premium template tests
- `apps/mobile/src/routes/programs/+page.svelte` — Added "From Template" FAB
- `apps/mobile/src/routes/settings/+page.svelte` — Added Restore Purchases and Manage Subscription
- `apps/mobile/src/routes/+layout.svelte` — Revalidation on mount and resume
- `apps/mobile/ios/App/App/Products.storekit` — StoreKit testing configuration
- `apps/mobile/ios/App/App/App.entitlements` — IAP entitlement
- `apps/mobile/fastlane/Fastfile` — Complete deployment automation (2309 lines)
- `apps/mobile/fastlane/Appfile` — App identifiers for com.fitlog.app
- `apps/mobile/fastlane/Matchfile` — Certificate management config
- `apps/mobile/fastlane/metadata/` — 40+ store metadata files (iOS + Android, de-DE + en-US)
- `apps/mobile/fastlane/screenshots/` — Frameit pipeline with per-locale strings and fonts
- `apps/mobile/fastlane/E2E_VERIFICATION.md` — Complete E2E verification runbook
- `apps/mobile/fastlane/DEPLOYMENT_WORKFLOW.md` — Deployment guide
- `apps/mobile/scripts/verify-s06-submission.sh` — 30-check pre-submission validation
- `apps/mobile/messages/de.json` — 365 keys (M003 additions integrated across slices)
- `apps/mobile/messages/en.json` — 365 keys (zero drift with de.json)

# M003: Monetization & Premium Features

**Vision:** Turn FitLog into a revenue-generating product with native in-app purchases, premium program templates from established methodologies, a polished paywall experience, and optimized App Store / Play Store listings.

## Success Criteria

- A user encountering a premium-gated feature (analytics, templates) sees a paywall sheet with real store prices loaded dynamically and can complete a purchase via native App Store / Play Store flow (sandbox/test track)
- After purchasing, premium features unlock immediately and remain unlocked across app restarts
- A user can browse premium program templates, purchase access, and create a program from a premium template
- A "Restore Purchases" button in settings recovers purchases on a fresh install
- Subscription status is revalidated on app launch — a cancelled subscription eventually revokes access
- The app is submitted to both App Store and Play Store with localized metadata (de + en), screenshots, and descriptions (no emojis)
- All new UI text exists in both de.json and en.json with zero key drift

## Key Risks / Unknowns

- **`@capgo/native-purchases` Capacitor 8 compatibility** — The plugin claims Cap 8 + SPM support but this project is an early adopter. Plugin integration failure would require fallback to RevenueCat or direct StoreKit/Billing wrappers.
- **App Store subscription review requirements** — Apple frequently rejects first subscription app submissions for missing terms display, missing restore button, or metadata issues.
- **Platform-specific billing API differences** — iOS StoreKit 2 vs Android Play Billing 7.x have different purchase state models (`isActive`/`expirationDate` vs `purchaseState`/`isAcknowledged`). The purchase service must abstract these cleanly.
- **Store setup prerequisites** — Google Play requires a closed testing track with real testers before IAP testing works. App Store Connect requires In-App Purchase entitlements and product configuration.

## Proof Strategy

- `@capgo/native-purchases` Cap 8 compatibility → retire in S01 by building a real purchase flow that completes a sandbox transaction on iOS
- App Store review compliance → retire in S04 by implementing all Apple-required subscription terms, restore button, and dynamic pricing in the paywall UI
- Platform billing differences → retire in S02 by building a PurchaseService that abstracts iOS/Android state models behind a unified `PurchasedProduct` type
- Store setup → retire in S06 by submitting real metadata to both stores via fastlane

## Verification Classes

- Contract verification: Unit tests for PurchaseService state management, premium gate logic with granular products, template data validation. `pnpm test` + `pnpm run build` must pass.
- Integration verification: Sandbox purchase flow on iOS simulator (StoreKit testing config), Google Play test track purchase. Real native plugin invocations.
- Operational verification: Purchase state persists across app restart. Subscription revalidation on launch. Restore purchases recovers state on fresh install.
- UAT / human verification: End-to-end purchase flow on physical devices in sandbox/test environments. Store listing review in App Store Connect and Google Play Console. Paywall UX visual review.

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 7 slices are marked complete with passing verification
- A test user can complete a subscription purchase in iOS sandbox and Android test track
- Premium features correctly unlock/lock based on granular purchase status (not just a single boolean)
- Purchase status persists across app restart and is revalidated on launch
- Premium program templates are browsable, purchasable, and usable to create real programs
- Paywall displays real store prices (not hardcoded) with Apple-required subscription terms
- Restore Purchases works and is accessible from settings
- App metadata is submitted to both stores via fastlane with de + en localizations
- All new UI keys exist in de.json and en.json with zero drift
- `pnpm test` passes, `pnpm run build` succeeds

## Requirement Coverage

- Covers: R020 (IAP infrastructure), R021 (premium templates), R022 (advanced analytics pack), R023 (paywall UX & upgrade flows), R024 (store optimization)
- Partially covers: R019 (freemium gate — wires real IAP to existing local gate from M002)
- Leaves for later: R025-R029 (M004 — cloud sync, accounts, backup, export)
- Orphan risks: None — all M003-scoped Active requirements have primary slice owners

## Slices

- [x] **S01: IAP Plugin Integration & First Purchase Flow** `risk:high` `depends:[]`
  > After this: A developer can trigger a real StoreKit sandbox purchase from within the app, see the native purchase dialog, and observe transaction completion logged to console. The `@capgo/native-purchases` plugin is proven working with Capacitor 8.

- [x] **S02: Purchase State Management & Premium Gate Wiring** `risk:medium` `depends:[S01]`
  > After this: Completing a sandbox purchase unlocks premium features (analytics tabs, progression suggestions, full PR history). The premium service tracks granular product purchases (subscription vs template packs) instead of a single boolean. Purchase state persists across app restart and is revalidated on launch.

- [ ] **S03: Paywall UX & Upgrade Flows** `risk:medium` `depends:[S02]`
  > After this: Tapping "Premium freischalten" on any UpgradePrompt opens a polished paywall sheet with dynamically loaded store prices, subscription terms, and a purchase button that triggers the real IAP flow. Restore Purchases is accessible from settings. Apple subscription review requirements (terms display, cancellation instructions) are met.

- [ ] **S04: Premium Program Templates** `risk:low` `depends:[S02]`
  > After this: Users can browse 5 premium program templates (periodized strength, linear progression, tiered volume, etc.) in the template selection UI. Premium templates show a lock icon and require purchase to use. After purchasing the template pack, users can create programs from these templates using the existing `createProgramFromTemplate()` flow.

- [ ] **S05: App Store & Play Store Listing Optimization** `risk:medium` `depends:[S03, S04]`
  > After this: App metadata (descriptions, keywords, screenshots, what's-new text) is prepared for both stores in de + en localizations via fastlane configuration. Privacy policy and terms of service URLs are set. Store assets are ready for submission.

- [ ] **S06: End-to-End Integration & Store Submission** `risk:medium` `depends:[S05]`
  > After this: The full purchase lifecycle is verified end-to-end on real devices — purchase, unlock, restart persistence, restore, subscription expiry. App is submitted to App Store Connect and Google Play Console. Fastlane deliver/supply pushes metadata to both stores.

- [ ] **S07: i18n — New Keys for All Locales** `risk:low` `depends:[S03, S04]`
  > After this: All new UI text from S01-S04 (paywall, subscription management, premium templates, store descriptions) exists in both de.json and en.json with zero key drift. Estimated ~40-60 new keys per locale.

## Boundary Map

### S01 → S02

Produces:
- `@capgo/native-purchases` plugin installed, configured, and proven working with Capacitor 8
- Native iOS/Android project updates (entitlements, plugin registration)
- `PurchasePlugin` thin wrapper module exposing `getProducts()`, `purchaseProduct()`, `restorePurchases()`, `getPurchases()`, `manageSubscriptions()` with typed returns
- Product ID constants for subscription and template pack products

Consumes:
- Nothing (first slice)

### S02 → S03

Produces:
- Evolved `premium.ts` with granular product tracking: `PurchasedProduct` type, per-product purchase status, subscription expiry checking, launch-time revalidation
- `canAccessFeature()` now checks specific product ownership (analytics subscription, template pack) instead of single boolean
- `PremiumFeature` enum extended with template-related features
- Reactive purchase state observable for UI binding

Consumes:
- S01's plugin wrapper and product ID constants

### S02 → S04

Produces:
- Same as S02 → S03 (premium gate infrastructure with granular product checks)

Consumes:
- S01's plugin wrapper and product ID constants

### S03 → S05

Produces:
- Paywall sheet component with dynamic pricing display
- Subscription terms text and cancellation instructions
- Restore Purchases flow in settings
- Manage Subscription link in settings

Consumes:
- S02's purchase state management and reactive status
- S01's plugin wrapper for `purchaseProduct()`, `restorePurchases()`, `getProducts()`

### S04 → S05

Produces:
- 5 premium program template files in `src/lib/data/templates/`
- Template registry extended with `premium` flag differentiation
- Template selection UI with premium/free distinction

Consumes:
- S02's premium gate for template access checks

### S05 → S06

Produces:
- Fastlane `Fastfile`, `Appfile`, `Deliverfile` configuration for iOS
- Fastlane `supply` configuration for Android
- Store metadata files (descriptions, keywords, what's-new) in de + en
- Screenshot assets (or placeholder pipeline)
- Privacy policy and terms of service URLs

Consumes:
- S03's paywall UI (for screenshots)
- S04's premium templates (for feature descriptions in store listing)

### S03, S04 → S07

Produces:
- All new i18n keys in de.json and en.json with zero drift

Consumes:
- S03's paywall UI text (key names and German base text)
- S04's template UI text (key names and German base text)

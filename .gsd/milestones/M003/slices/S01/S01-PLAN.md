# S01: IAP Plugin Integration & First Purchase Flow

**Goal:** Prove `@capgo/native-purchases` works with Capacitor 8, create a typed plugin wrapper with platform guards, and enable a sandbox purchase flow testable on iOS.
**Demo:** A developer builds for iOS, opens the app in Xcode with StoreKit configuration, navigates to Settings → dev section, taps "Test Purchase," sees the native StoreKit purchase dialog, completes the sandbox transaction, and observes the transaction result logged and displayed in the UI.

## Must-Haves

- `@capgo/native-purchases` installed and registered in both iOS (SPM) and Android native projects via `cap sync`
- iOS In-App Purchase entitlement file (`App.entitlements`) created and referenced in Xcode project
- StoreKit testing configuration file (`Products.storekit`) with 3 test products (annual sub, monthly sub, template pack)
- `purchase-plugin.ts` typed wrapper module guarding all calls with `Capacitor.isNativePlatform()` — returns safe defaults on web
- Product ID constants (`PRODUCT_IDS`) for subscription and template pack products matching D068
- Dev-only "Test Purchase" UI in settings page to trigger sandbox purchase and display transaction result
- `pnpm test` passes and `pnpm run build` succeeds
- Existing dev premium toggle in settings remains functional

## Proof Level

- This slice proves: integration (real plugin ↔ Capacitor 8 ↔ native StoreKit sandbox)
- Real runtime required: yes (iOS simulator with StoreKit config or physical device with sandbox credentials)
- Human/UAT required: yes (developer must trigger sandbox purchase in Xcode to confirm native dialog appears and transaction completes)

## Verification

- `pnpm --filter mobile test` — unit tests for purchase-plugin.ts wrapper pass (platform guard logic, product ID constants, type exports)
- `pnpm run build` from `apps/mobile` — TypeScript compilation succeeds with no errors
- `npx cap sync` from `apps/mobile` — completes without errors, SPM Package.swift includes `CapgoNativePurchases` entry
- Manual: iOS build in Xcode → Run with StoreKit configuration → Settings → Test Purchase → native dialog appears → transaction logged
- Test file: `apps/mobile/src/lib/services/__tests__/purchase-plugin.test.ts`

## Observability / Diagnostics

- Runtime signals: `[PurchasePlugin]` prefixed console logs for every wrapper function call — includes function name, arguments (product IDs only, no secrets), success/failure, and error details. Matches `[Premium]` and `[Haptics]` log prefix patterns.
- Inspection surfaces: Dev-only UI in settings shows last transaction result (product ID, transaction ID, platform) or error message. `isBillingSupported()` result shown in dev section header.
- Failure visibility: Every wrapper function catches errors and logs them with `console.error('[PurchasePlugin]', functionName, error)`. Web/non-native calls return typed safe defaults (empty arrays, false, null) with `console.debug` noting the platform guard.
- Redaction constraints: No purchase tokens, receipt data, or user credentials logged. Only product IDs and transaction IDs in logs.

## Integration Closure

- Upstream surfaces consumed: none (first slice in M003)
- New wiring introduced in this slice:
  - `@capgo/native-purchases` npm package → Capacitor plugin registration → native iOS/Android
  - `purchase-plugin.ts` wrapper module exposing typed functions + product ID constants
  - iOS `App.entitlements` with In-App Purchase capability
  - `Products.storekit` StoreKit testing configuration
  - Dev-only test purchase UI in settings
- What remains before the milestone is truly usable end-to-end:
  - S02: PurchaseService with granular product tracking, premium gate wiring, persistence
  - S03: Paywall sheet with dynamic pricing, restore purchases, subscription terms
  - S04: Premium template content and template selection UI gating
  - S05: Store metadata and fastlane configuration
  - S06: End-to-end verification on physical devices and store submission
  - S07: i18n for all new keys

## Tasks

- [x] **T01: Install plugin, sync native projects, create test scaffolding** `est:45m`
  - Why: Retires the #1 risk — proving `@capgo/native-purchases` works with Capacitor 8 + SPM. Creates the test file that the rest of the slice must make pass.
  - Files: `apps/mobile/package.json`, `apps/mobile/ios/App/CapApp-SPM/Package.swift`, `apps/mobile/src/lib/services/__tests__/purchase-plugin.test.ts`
  - Do: Install `@capgo/native-purchases@8.2.2` as devDependency. Run `npx cap sync` from `apps/mobile`. Verify `Package.swift` includes `CapgoNativePurchases`. If not, add manually following the existing 8-entry pattern. Create the test file with tests for: product ID constants (correct values and types), wrapper function exports (all 7 functions exist), platform guard behavior (returns safe defaults when `isNativePlatform` returns false). Tests should initially fail because `purchase-plugin.ts` doesn't exist yet.
  - Verify: `pnpm install` succeeds, `npx cap sync` succeeds, `Package.swift` has 9 plugin entries, test file exists and runs (tests fail as expected)
  - Done when: Plugin is installed, native projects synced with plugin registered in SPM, test file runs with expected failures

- [x] **T02: Create typed purchase-plugin wrapper module** `est:45m`
  - Why: Provides the typed API surface that S02-S06 will consume. All native plugin calls go through this wrapper — it's the single integration point.
  - Files: `apps/mobile/src/lib/services/purchase-plugin.ts`
  - Do: Create `purchase-plugin.ts` with: (1) `PRODUCT_IDS` constant object with `PREMIUM_ANNUAL`, `PREMIUM_MONTHLY`, `TEMPLATE_PACK` keys and `PLAN_IDS` for Android. (2) Platform guard helper using `Capacitor.isNativePlatform()`. (3) Typed wrapper functions: `isBillingSupported()`, `getProducts()`, `getProduct()`, `purchaseProduct()`, `getPurchases()`, `restorePurchases()`, `manageSubscriptions()`. Each function: checks platform (returns safe default on web with debug log), wraps the `NativePurchases` call in try/catch, logs with `[PurchasePlugin]` prefix, returns typed result. Re-export `PURCHASE_TYPE`, `Product`, `Transaction` types from the plugin. Follow error resilience pattern from `haptics.ts` but return results (not fire-and-forget).
  - Verify: `pnpm --filter mobile test` — all tests from T01 pass. `pnpm run build` succeeds.
  - Done when: All purchase-plugin tests pass, build succeeds, module exports all typed functions and constants

- [x] **T03: Add iOS entitlements and StoreKit testing configuration** `est:30m`
  - Why: iOS requires the In-App Purchase entitlement for StoreKit to work. The StoreKit configuration file enables local sandbox testing without App Store Connect setup.
  - Files: `apps/mobile/ios/App/App/App.entitlements`, `apps/mobile/ios/App/App/Products.storekit`, `apps/mobile/ios/App/App.xcodeproj/project.pbxproj`
  - Do: (1) Create `App.entitlements` plist with `com.apple.developer.in-app-purchases` set to true. (2) Create `Products.storekit` StoreKit configuration file with 3 products matching `PRODUCT_IDS`: annual subscription (`com.fitlog.app.premium.annual`), monthly subscription (`com.fitlog.app.premium.monthly`), one-time template pack (`com.fitlog.app.templates.pack`). Include subscription group "Premium" for the two subs. (3) Add the entitlements file reference to `project.pbxproj` — set `CODE_SIGN_ENTITLEMENTS` in both Debug and Release build settings. Document that the developer must select `Products.storekit` in Xcode scheme → Run → Options → StoreKit Configuration for sandbox testing.
  - Verify: `pnpm run build` still succeeds. Entitlements file and storekit file exist at expected paths. `project.pbxproj` references the entitlements file.
  - Done when: iOS project has IAP entitlement, StoreKit config with 3 test products, and pbxproj references are correct

- [x] **T04: Add dev-only test purchase UI in settings** `est:45m`
  - Why: Provides the developer-facing verification surface — the demo outcome. Without this, there's no way to trigger and observe a sandbox purchase from within the app.
  - Files: `apps/mobile/src/routes/settings/+page.svelte`, `apps/mobile/messages/de.json`, `apps/mobile/messages/en.json`
  - Do: (1) Extend the existing `{#if import.meta.env.DEV}` section in settings with a "IAP Testing" subsection below the premium toggle. (2) Add a "Billing Supported" status indicator showing `isBillingSupported()` result. (3) Add a "Load Products" button that calls `getProducts()` and displays the returned product list (name, price, ID). (4) Add a "Purchase Annual" button that calls `purchaseProduct()` with the annual subscription product ID and displays the transaction result or error. (5) Add a "Restore Purchases" button that calls `restorePurchases()` and displays the result. (6) Show last transaction/error result in a formatted display area. (7) Add i18n keys for all new UI text in both `de.json` and `en.json` — these are dev-only strings but keeping i18n consistent. (8) On web, the billing supported indicator should show "Not supported (web)" and purchase buttons should be disabled.
  - Verify: `pnpm run build` succeeds. `pnpm --filter mobile test` passes. Dev server shows the IAP testing section in settings with all buttons. On web, buttons are correctly disabled with "not supported" shown.
  - Done when: Settings page has a complete IAP test section that shows billing status, loads products, triggers purchases, restores purchases, and displays results — all functional on native, gracefully degraded on web

## Files Likely Touched

- `apps/mobile/package.json`
- `apps/mobile/pnpm-lock.yaml`
- `apps/mobile/ios/App/CapApp-SPM/Package.swift`
- `apps/mobile/android/app/build.gradle` (via cap sync)
- `apps/mobile/src/lib/services/purchase-plugin.ts`
- `apps/mobile/src/lib/services/__tests__/purchase-plugin.test.ts`
- `apps/mobile/ios/App/App/App.entitlements`
- `apps/mobile/ios/App/App/Products.storekit`
- `apps/mobile/ios/App/App.xcodeproj/project.pbxproj`
- `apps/mobile/src/routes/settings/+page.svelte`
- `apps/mobile/messages/de.json`
- `apps/mobile/messages/en.json`

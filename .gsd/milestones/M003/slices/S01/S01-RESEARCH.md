# S01: IAP Plugin Integration & First Purchase Flow — Research

**Date:** 2026-03-12

## Summary

S01 retires the highest-risk item in M003: proving that `@capgo/native-purchases` works with Capacitor 8 and can complete a real StoreKit sandbox transaction. The plugin (`@capgo/native-purchases@8.2.2`) declares `@capacitor/core >=8.0.0` as its peer dependency — fully compatible with the project's `@capacitor/core@8.2.0`. It uses SPM for iOS (matching the existing `CapApp-SPM/Package.swift` pattern used by all other Capgo plugins) and auto-adds the Google Play Billing dependency on Android.

The plugin API is straightforward: `isBillingSupported()` → `getProducts()` / `getProduct()` → `purchaseProduct()` → `getPurchases()` / `restorePurchases()` / `manageSubscriptions()`. It exports `NativePurchases` (the plugin interface), `PURCHASE_TYPE` (enum: `INAPP`, `SUBS`), `Product`, and `Transaction` types. There is **no web implementation** — calls will throw on web. The existing dev-only premium toggle in settings (`import.meta.env.DEV`) must remain as the web/dev fallback.

The slice scope is intentionally narrow: install the plugin, add iOS In-App Purchase entitlement + StoreKit testing configuration, create a thin typed wrapper module (`purchase-plugin.ts`) that guards against web calls, define product ID constants, and build a minimal dev-facing "test purchase" UI to trigger a sandbox transaction. No premium gate wiring (S02), no paywall (S03), no template content (S04). The deliverables must be testable on an iOS simulator with a StoreKit configuration file or on a physical device with sandbox credentials.

## Recommendation

**Approach:**

1. Install `@capgo/native-purchases` as a devDependency (matching existing plugin convention), run `npx cap sync` from the `apps/mobile` directory.
2. Verify SPM integration: `Package.swift` should auto-update with the new plugin dependency after `cap sync`.
3. Add iOS In-App Purchase entitlement: create `App.entitlements` file with `com.apple.developer.in-app-purchases` capability, reference it from the Xcode project.
4. Create a StoreKit testing configuration file (`Products.storekit`) in the iOS project with test product definitions matching the app's product IDs. This enables sandbox testing in Xcode without App Store Connect setup.
5. Create `src/lib/services/purchase-plugin.ts` — a thin typed wrapper around `NativePurchases` that:
   - Guards all calls with `Capacitor.isNativePlatform()` check (return graceful no-ops on web)
   - Exposes typed functions: `initializePurchases()`, `getProducts()`, `purchaseProduct()`, `restorePurchases()`, `getPurchases()`, `manageSubscriptions()`, `isBillingSupported()`
   - Defines product ID constants (`PRODUCT_IDS`) for the subscription and template pack products
6. Create a temporary dev-only test page or extend the existing settings dev section to trigger a test purchase and log the transaction result.
7. Test: build for iOS, open in Xcode with StoreKit configuration, trigger sandbox purchase, observe transaction logged to console.

**Why this order:** Plugin installation + native project sync is the atomic risk gate. If `cap sync` fails or the plugin doesn't register with Capacitor 8 SPM, we know immediately. The wrapper module and test UI are trivial once the plugin works.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Cross-platform IAP (StoreKit 2 + Play Billing 7.x) | `@capgo/native-purchases@8.2.2` | Free, Cap 8 peer dep, SPM-ready, same Capgo vendor as `capacitor-fast-sql`. Wraps latest native billing APIs. |
| Web platform guard | `Capacitor.isNativePlatform()` from `@capacitor/core` | Standard Capacitor API to detect native vs web. Prevents plugin calls that would throw on web. |
| iOS sandbox testing without App Store Connect | StoreKit testing configuration (`.storekit` file) | Xcode-native feature — define test products locally, no server setup, no Apple Developer account product creation needed for initial development. |
| Product type enum | `PURCHASE_TYPE` from `@capgo/native-purchases` | Plugin exports `INAPP` and `SUBS` enum values. No need to define custom type constants. |

## Existing Code and Patterns

- `apps/mobile/src/lib/services/premium.ts` — Current premium service. Simple boolean via `@capacitor/preferences`. S01 does NOT modify this — S02 will evolve it to granular product tracking. S01 only provides the plugin wrapper that S02 will consume.
- `apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` — `handleUpgrade()` currently just logs. S01 does NOT wire this — S03 will connect it to the paywall. S01's test UI is separate and dev-only.
- `apps/mobile/ios/App/CapApp-SPM/Package.swift` — SPM manifest managed by Capacitor CLI. Currently has 8 plugin dependencies. After `cap sync`, should auto-add `CapgoNativePurchases` entry. If it doesn't, manual addition following the existing pattern is straightforward.
- `apps/mobile/capacitor.config.ts` — No IAP plugin config expected here. The plugin needs no Capacitor config entries — only native entitlements.
- `apps/mobile/ios/App/App/Info.plist` — `CFBundleDevelopmentRegion: de`, `CFBundleLocalizations: [de, en]`. No IAP-specific plist entries needed — entitlements are separate.
- `apps/mobile/ios/App/App.xcodeproj/project.pbxproj` — Uses automatic provisioning (`ProvisioningStyle = Automatic`). In-App Purchase capability needs to be added either via Xcode UI or by editing the pbxproj + creating an entitlements file.
- `apps/mobile/src/routes/settings/+page.svelte` — Has `{#if import.meta.env.DEV}` section with premium toggle. Natural location to add a "Test Purchase" button for S01 verification.
- `apps/mobile/src/lib/services/haptics.ts` — Reference pattern for fire-and-forget native service calls with try/catch. The purchase plugin wrapper should follow the same error resilience pattern (though purchases are NOT fire-and-forget — they need results).

## Constraints

- **No web implementation in `@capgo/native-purchases`:** All plugin calls will throw on web. The wrapper module MUST guard every call with a platform check. Dev/web testing continues via the existing `import.meta.env.DEV` premium toggle.
- **Capacitor 8.2.0 + SPM:** The project uses SPM-based iOS dependency management (not CocoaPods). `@capgo/native-purchases@8.2.2` lists `@capacitor/core >=8.0.0` as peer dep and the README mentions SPM support. `cap sync` should handle SPM registration automatically.
- **StoreKit 2 requires iOS 15+:** The SPM Package.swift already targets `.iOS(.v15)`, so this is met.
- **Android requires `planIdentifier` for subscriptions:** `purchaseProduct()` with `productType: SUBS` requires a `planIdentifier` param on Android (ignored on iOS). The product ID constants must include corresponding plan IDs.
- **Product IDs must match store configuration:** Product identifiers used in code must exactly match what's configured in App Store Connect / Google Play Console. For S01 (sandbox testing only), the StoreKit configuration file defines these locally — no store console setup needed.
- **`autoAcknowledgePurchases` defaults to true:** The plugin auto-acknowledges Android purchases by default. This is the correct behavior for M003 (no server-side validation).
- **No `initialize()` call needed:** Unlike RevenueCat, the Capgo plugin does not require an initialization call with an API key. It uses the native store APIs directly. `isBillingSupported()` is the readiness check.

## Product ID Convention

Based on D066 (Capgo native purchases), D067 (granular product model), and D068 (annual subscription + template pack):

| Product | Type | Product ID | Plan ID (Android) |
|---------|------|------------|-------------------|
| Analytics subscription (annual) | `SUBS` | `com.fitlog.app.premium.annual` | `annual-plan` |
| Analytics subscription (monthly) | `SUBS` | `com.fitlog.app.premium.monthly` | `monthly-plan` |
| Template pack (one-time) | `INAPP` | `com.fitlog.app.templates.pack` | n/a |

Note: Monthly subscription included for future flexibility (D068 says "architecture supports adding monthly/lifetime later"). Only annual + template pack are required for launch. The StoreKit testing configuration should include all three for completeness.

## Common Pitfalls

- **Calling plugin on web → unhandled exception** — `NativePurchases` has no web implementation. Every function in the wrapper must check `Capacitor.isNativePlatform()` first and return a safe default (empty product list, false for billing supported, etc.). The existing dev toggle in settings is the web fallback.
- **SPM resolution failure after cap sync** — If `cap sync` doesn't add the plugin to `Package.swift`, the iOS build will fail with missing module errors. Verify `Package.swift` immediately after sync. If missing, add manually following the existing 8-entry pattern.
- **Missing In-App Purchase entitlement → StoreKit failure** — iOS requires the `com.apple.developer.in-app-purchases` entitlement. Without it, `getProducts()` returns empty results and `purchaseProduct()` fails silently. Must create `App.entitlements` and reference it in the Xcode project.
- **StoreKit configuration not set in Xcode scheme → no products returned** — The `.storekit` file must be selected as the StoreKit Configuration in the Xcode scheme's Run → Options tab. Without this, `getProducts()` returns empty even if the file exists.
- **Forgetting `productType` parameter → wrong products or errors** — `getProducts()` and `purchaseProduct()` require explicit `productType: PURCHASE_TYPE.SUBS` for subscriptions. Omitting it defaults to `INAPP`.
- **Android `planIdentifier` omission → silent failure** — Subscription purchases on Android silently fail without `planIdentifier`. The wrapper must enforce this via the typed API (required param when `productType === SUBS`).

## Open Risks

- **`cap sync` SPM integration for `@capgo/native-purchases`** — While the peer dep declares Cap 8 compatibility and SPM support, this project would be among the first to use it with Cap 8.2.0 + the existing SPM setup. If `cap sync` doesn't register the plugin, manual `Package.swift` editing following the established pattern is the fallback. Likelihood: low (other Capgo plugins work fine). Impact: 1-2 hours manual fix.
- **StoreKit configuration file format** — The `.storekit` file format is Xcode-managed and not well-documented for manual creation. If manual creation fails, the alternative is to create it via Xcode UI (requires opening the project in Xcode). This is a tooling concern, not a code concern.
- **iOS entitlements via headless project edit** — Adding the In-App Purchase entitlement requires either Xcode UI or editing `project.pbxproj` + creating an entitlements plist. The pbxproj format is fragile — manual edits risk corruption. Safest approach: document the steps for the user to add the capability in Xcode, or use `xcodeproj` tooling if available.
- **Plugin version drift** — `@capgo/native-purchases@8.2.2` is current as of today. No known breaking changes, but pinning the version in `package.json` is prudent.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Capacitor best practices | `cap-go/capacitor-skills@capacitor-best-practices` | available (296 installs) — broadly relevant to all Capacitor plugin work |
| Capacitor plugins | `cap-go/capacitor-skills@capacitor-plugins` | available (129 installs) — directly relevant to plugin integration patterns |
| Capacitor App Store | `cap-go/capacitor-skills@capacitor-app-store` | available (78 installs) — relevant to store submission (more S05/S06 than S01) |
| Capacitor security | `cap-go/capacitor-skills@capacitor-security` | available (91 installs) — lower priority, may help with receipt handling |
| IAP (iOS) | `fotescodev/ios-agent-skills@axiom-in-app-purchases` | available (3 installs) — low install count, skip |

**Recommendation:** Consider installing `cap-go/capacitor-skills@capacitor-best-practices` and `cap-go/capacitor-skills@capacitor-plugins` — they're from the same vendor as the IAP plugin and the existing DB plugin, high install counts, and directly relevant to getting plugin integration right. Commands:
```bash
npx skills add cap-go/capacitor-skills@capacitor-best-practices
npx skills add cap-go/capacitor-skills@capacitor-plugins
```

## Sources

- `@capgo/native-purchases` full API: `NativePurchases.isBillingSupported()`, `getProducts()`, `getProduct()`, `purchaseProduct()`, `getPurchases()`, `restorePurchases()`, `manageSubscriptions()` (source: Context7 /cap-go/capacitor-native-purchases, trust 9.8/10, benchmark 51.8)
- Plugin version and peer deps: `@capgo/native-purchases@8.2.2` requires `@capacitor/core >=8.0.0` (source: npm registry)
- iOS subscription response shape: `isActive`, `expirationDate`, `willCancel`, `isTrialPeriod`, `isInIntroPricePeriod` (source: Context7 plugin docs — getPurchases iOS example)
- Android subscription response shape: `purchaseState` (`PURCHASED` or `1`), `isAcknowledged`, `purchaseToken`; does NOT reliably provide `isActive`/`expirationDate` client-side (source: Context7 plugin docs — getPurchases Android example)
- Platform difference: Android subscriptions require `planIdentifier` in `purchaseProduct()`, ignored on iOS (source: Context7 plugin docs — subscription purchase example)
- No web implementation: plugin requires native platform; `Capacitor.isNativePlatform()` guard needed (source: inferred from API patterns + no web implementation mentioned in docs)
- Existing codebase: `premium.ts`, `UpgradePrompt.svelte`, settings dev toggle, `CapApp-SPM/Package.swift` SPM structure, `AppDelegate.swift`, `build.gradle` (source: local codebase exploration)

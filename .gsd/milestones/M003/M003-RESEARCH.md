# M003: Monetization & Premium Features — Research

**Date:** 2026-03-12

## Summary

M003 turns FitLog from a free tool into a revenue-generating product. The core technical challenge is wiring native in-app purchase flows (StoreKit 2 on iOS, Google Play Billing 7.x on Android) into the existing Capacitor 8 hybrid app and connecting successful purchases to the local premium feature-flag service that M002 already built. The freemium gate infrastructure (D048, D063-D065) is solid — `premium.ts` service, page-level enforcement, `UpgradePrompt` component, dev toggle in settings — and just needs real IAP wiring instead of the current Preferences-only toggle.

The primary recommendation is **`@capgo/native-purchases`** over RevenueCat for the IAP plugin. It's free (zero revenue share), from the same Capgo team whose `capacitor-fast-sql` already powers the data layer, uses StoreKit 2 + Play Billing 7.x directly, and supports Capacitor 8 with SPM. RevenueCat adds a backend dependency, revenue share (starts at ~1% after $2.5M), and is overkill for an app that doesn't need server-side receipt validation yet (that's M004 scope). The Capgo plugin covers purchasing, restore, subscription status checks, and subscription management — everything needed for M003's local-only validation scope.

For premium content, the existing template system (`ProgramTemplate` type, `createProgramFromTemplate()`, exercise name resolution via `getByName()`) is directly reusable. Premium templates are just more `ProgramTemplate` objects with a `premium: true` flag, gated at the selection UI. The 5 established methodologies (5/3/1 variants, GZCL, nSuns, etc.) should use generic descriptive names to avoid trademark issues. For store listings, the project already uses fastlane in references and has iOS/Android native projects scaffolded with `com.fitlog.app` bundle ID, German as primary locale, and English as secondary.

## Recommendation

**Approach:** Use `@capgo/native-purchases` for IAP infrastructure. Implement a `PurchaseService` that wraps the plugin, manages purchase state via `@capacitor/preferences` (extending the existing `premium.ts`), and exposes a reactive purchase status. Wire the existing `UpgradePrompt` component's `handleUpgrade()` to the real purchase flow. Create premium templates as new files in `src/lib/data/templates/` with the established patterns. Build a dedicated paywall page/sheet that loads product info dynamically from the store (Apple requires this — no hardcoded prices). Use fastlane for store metadata submission.

**Slice ordering should be risk-first:**
1. IAP plugin integration + purchase flow (highest risk — native plugin, store sandbox testing)
2. Purchase state management + premium gate wiring (connects IAP to existing gates)
3. Premium program templates (content creation, lowest risk)
4. Paywall UX + upgrade flows (UI, depends on IAP being functional)
5. Store listing optimization (metadata, screenshots — last because app must be feature-complete)
6. i18n for new keys

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Cross-platform IAP (StoreKit 2 + Play Billing 7.x) | `@capgo/native-purchases` | Free, Capacitor 8 native, SPM-ready, same vendor as existing DB plugin. Wraps latest native billing APIs. |
| Purchase receipt/state persistence | `@capacitor/preferences` (already in deps) | Already powers `premium.ts` service. Extend with transaction IDs and product types. |
| Store metadata submission (iOS) | fastlane `deliver` (in references/) | Industry standard for App Store metadata, screenshots, and submissions. Automates what would be tedious manual work in App Store Connect. |
| Store metadata submission (Android) | fastlane `supply` (in references/) | Same fastlane toolchain for Google Play Console uploads. |
| Paywall UI components | shadcn-svelte `dialog`, `sheet`, `card`, `button`, `badge` | Full component library already available. Sheet is ideal for bottom-up paywall on mobile. |
| Program template system | `ProgramTemplate` type + `createProgramFromTemplate()` | Proven pattern from M001/S05. Premium templates are structurally identical to free ones. |
| Feature gating | `premium.ts` + `isPremiumUser()` + page-level enforcement | Entire infrastructure built in M002/S06 (D048, D063-D065). Just needs IAP wiring. |

## Existing Code and Patterns

- `apps/mobile/src/lib/services/premium.ts` — Current premium service using `@capacitor/preferences`. Has `isPremiumUser()`, `setPremiumStatus()`, `canAccessFeature()`, `PremiumFeature` enum. Needs extending: granular product tracking, transaction persistence, subscription expiry checking.
- `apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` — Existing upgrade prompt card with lock icon, feature-specific descriptions, and a "Premium freischalten" button. `handleUpgrade()` currently just logs. Wire to real purchase flow.
- `apps/mobile/src/routes/history/analytics/+page.svelte` — Reference implementation of page-level premium gating (D064). Checks `isPremiumUser()` in `$effect`, restricts tabs and time ranges. Pattern to replicate for new premium surfaces.
- `apps/mobile/src/routes/history/prs/+page.svelte` — Another premium gate example. Limits free users to 3 exercise PR groups, shows `UpgradePrompt` when gated.
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — Progression suggestions gated behind premium check (fire-and-forget load).
- `apps/mobile/src/routes/settings/+page.svelte` — Has dev-only premium toggle via `import.meta.env.DEV`. This should evolve to show subscription status and management link in production.
- `apps/mobile/src/lib/data/templates/` — Template registry pattern. `types.ts` defines `ProgramTemplate` interface. `index.ts` exports `PROGRAM_TEMPLATES` array. Each template is a separate file. Premium templates follow the same pattern, just need a `premium` flag or separate registry.
- `apps/mobile/src/lib/db/services/template-service.ts` — `createProgramFromTemplate()` with fail-fast exercise name resolution (D032, D033). Reusable as-is for premium templates.
- `apps/mobile/src/lib/db/seed/exercises.ts` — 55 curated exercises. Premium templates must use exact names from this seed data.
- `apps/mobile/capacitor.config.ts` — Current config with SplashScreen and CapacitorUpdater plugins. IAP plugin may need registration here.
- `apps/mobile/ios/App/App/Info.plist` — iOS config with `de` as primary locale, `en` as secondary. No IAP entitlements yet — need to add In-App Purchase capability.
- `apps/mobile/android/app/build.gradle` — Android config with `com.fitlog.app` application ID. Google Play Billing dependency will be added by the Capgo plugin automatically.
- `apps/mobile/messages/de.json` / `en.json` — 321 keys each, synchronized. 8 premium-related keys already exist. Will need ~40-60 new keys for paywall, subscription management, premium templates, store descriptions.

## Constraints

- **No server-side validation (M003 scope):** M003 explicitly excludes server-side receipt validation (M004 scope). Purchase validation is local-only: check `isActive` on iOS subscriptions, `purchaseState` + `isAcknowledged` on Android. This is acceptable for launch but means a determined user could bypass the gate. Acceptable risk for a fitness app.
- **Capacitor 8 plugin compatibility:** The `@capgo/native-purchases` plugin must support Capacitor 8. Documentation mentions SPM support and Capacitor 8 readiness. Verify during slice S01.
- **Apple requires dynamic pricing:** All prices must be loaded from StoreKit at runtime. Never hardcode prices in UI. The `getProduct()` / `getProducts()` API returns `priceString` for localized display.
- **Apple subscription review requirements:** Apps must display subscription terms (duration, price, auto-renewal terms, cancellation instructions) near the purchase button. Missing this is a common rejection reason.
- **Android requires `planIdentifier` for subscriptions:** Google Play Billing 7.x requires a `planIdentifier` (base plan ID) for subscription purchases. This is ignored on iOS but must be provided for Android.
- **No emojis in store metadata:** AGENTS.md explicitly prohibits emojis in store listing text. All descriptions, keywords, and what's-new text must be emoji-free.
- **i18n: German base locale:** All new UI keys must be added to `de.json` first, then `en.json`. 321 keys currently synchronized.
- **Platform-specific purchase state differences:** iOS subscriptions have `isActive`, `expirationDate`, `willCancel`. Android IAPs lack `isActive` and `expirationDate` — must use `purchaseState` + `isAcknowledged`. The purchase service must abstract these differences.
- **One premium status flag currently:** The existing `premium.ts` stores a single boolean. M003 needs to support: (a) analytics pack (subscription), (b) individual template packs (one-time purchases), potentially (c) an "everything" bundle. The premium service must evolve to track which products are purchased, not just "is premium."

## Common Pitfalls

- **Hardcoded prices → App Store rejection** — Apple rejects apps that display hardcoded prices instead of loading from StoreKit. Always use `product.priceString` from `NativePurchases.getProduct()`.
- **Missing subscription terms display → App Store rejection** — Apple requires subscription details (auto-renewal terms, price, period, cancellation instructions) visible at the point of purchase. Must include this text in the paywall UI.
- **Forgetting restore purchases → App Store rejection** — Apple requires a "Restore Purchases" button accessible to users. Common to forget this. Must be in settings or paywall.
- **Android subscription without planIdentifier → purchase failure** — Google Play Billing 7.x requires `planIdentifier`. Omitting it silently fails on Android subscriptions. Must map product IDs to plan IDs.
- **Testing only in development, not sandbox** — IAP flows must be tested in App Store sandbox and Google Play test tracks. The web dev environment can only mock. Slice ordering should ensure sandbox testing happens early.
- **Premium gate race condition on app launch** — `isPremiumUser()` is async. If purchase state isn't loaded before a gated page renders, users might see premium content flash then disappear (or vice versa). Need loading states during premium check.
- **Template trademark issues** — Using "5/3/1" (Jim Wendler), "nSuns" (Reddit user), "GZCL" (Cody Lefever) directly could invite C&D. Use generic descriptive names: "Periodized Strength 531", "Linear Progression LP", "Tiered Volume Method". Describe the methodology, don't name-drop.
- **Subscription expiry not checked locally** — If the app only checks `isActive` at purchase time but never rechecks, a cancelled subscription remains active forever locally. Need periodic revalidation via `getPurchases()` — at minimum on app launch.
- **Not handling purchase interruption** — Users can close the app mid-purchase. The Capgo plugin handles transaction finishing, but the app must handle the case where a purchase succeeds but the grant-access flow didn't complete. `restorePurchases()` on app launch is the safety net.

## Open Risks

- **`@capgo/native-purchases` Capacitor 8 compatibility** — Documentation claims Capacitor 8 SPM support, but this project is among early adopters of Capacitor 8. Risk: plugin may need patches. Mitigation: test integration in S01 before building dependent slices.
- **First App Store submission rejection** — Apple frequently rejects first submissions for subscription apps. Common reasons: missing subscription terms, missing restore button, metadata issues, screenshots not matching app. Mitigation: follow Apple's subscription review checklist explicitly.
- **Google Play closed testing setup** — Google Play requires a closed testing track with real testers before IAP testing works. This is a prerequisite for M003 Android testing. Mitigation: set up test track early in S01.
- **Pricing model uncertainty** — Monthly sub vs. annual vs. lifetime vs. individual packs. This is a business decision, not a technical one. The architecture should support all models. Recommend starting with: annual subscription (most common in fitness apps) + individual template packs (one-time).
- **Premium template content quality** — Templates must be genuinely valuable to justify purchase. Generic templates won't convert. Requires real strength training knowledge for accurate periodization.
- **Web fallback for IAP** — `@capgo/native-purchases` has no web implementation. The dev toggle in settings (`import.meta.env.DEV`) must remain for local development. No IAP on web — only native.

## Candidate Requirements

The following are not in `REQUIREMENTS.md` but surfaced during research. They should be considered for inclusion:

| Candidate | Type | Rationale |
|-----------|------|-----------|
| **Restore Purchases flow** | table-stakes | Apple requires a visible "Restore Purchases" button. Rejection if missing. Should be part of R023 (Paywall UX). |
| **Subscription terms display** | table-stakes | Apple requires auto-renewal terms, price, period, and cancellation instructions near the purchase button. Rejection if missing. Should be part of R023. |
| **Subscription status revalidation on app launch** | table-stakes | Without periodic recheck of subscription status, cancelled subscriptions remain active forever locally. Should be part of R020. |
| **Purchase interruption recovery** | table-stakes | If purchase succeeds but app crashes before granting access, `restorePurchases()` on next launch recovers. Part of R020 robustness. |
| **Manage Subscription link** | expected-behavior | Users expect to manage/cancel subscriptions from within the app. `NativePurchases.manageSubscriptions()` opens the native management page. Part of R023. |
| **Privacy policy URL** | table-stakes (store) | Both stores require a privacy policy URL for apps with purchases. Must exist before submission. Part of R024. |
| **Terms of service URL** | table-stakes (store) | Apple requires ToS URL for subscription apps. Part of R024. |

These are all standard requirements for any app with in-app purchases. They should be treated as sub-items of existing requirements (R020, R023, R024) rather than new top-level requirements.

## Skills Discovered

| Technology | Skill | Status | Recommendation |
|------------|-------|--------|----------------|
| Capacitor best practices | `cap-go/capacitor-skills@capacitor-best-practices` | available (296 installs) | Consider installing — high install count, same vendor as IAP plugin |
| Capacitor App Store | `cap-go/capacitor-skills@capacitor-app-store` | available (78 installs) | Consider installing — directly relevant to store submission |
| Capacitor security | `cap-go/capacitor-skills@capacitor-security` | available (91 installs) | Lower priority — security focus may help with receipt handling |
| RevenueCat | `revenuecat/revenuecat-skill@revenuecat` | available (171 installs) | Skip — recommending @capgo/native-purchases instead |
| App Store readiness | `eddiebe147/claude-settings@appstore-readiness` | available (85 installs) | Consider installing — relevant to R024 store optimization |

## Sources

- `@capgo/native-purchases` API, setup, purchase flows, subscription management, platform differences (source: Context7 /cap-go/capacitor-native-purchases, trust 9.8/10, benchmark 51.8)
- `@revenuecat/purchases-capacitor` API and configuration (source: Context7 /revenuecat/purchases-capacitor, trust 9.8/10, benchmark 31.0)
- Existing codebase: `premium.ts`, `UpgradePrompt.svelte`, analytics/prs page-level gating, template system, DB schema v5, native project configs
- Template pattern: `ProgramTemplate` type, `createProgramFromTemplate()`, exercise name resolution via `ExerciseRepository.getByName()`
- Decisions register: D048 (freemium gate), D063 (free-tier scope), D064 (page-level enforcement), D065 (non-gated features)
- fastlane deliver/supply documentation (references/fastlane/)

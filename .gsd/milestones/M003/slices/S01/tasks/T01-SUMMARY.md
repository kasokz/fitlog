---
id: T01
parent: S01
milestone: M003
provides:
  - "@capgo/native-purchases@8.2.2 installed and synced with Capacitor 8 native projects"
  - "Test scaffolding for purchase-plugin wrapper (initially failing — expected)"
key_files:
  - apps/mobile/package.json
  - apps/mobile/ios/App/CapApp-SPM/Package.swift
  - apps/mobile/src/lib/services/__tests__/purchase-plugin.test.ts
key_decisions:
  - "Plugin installed as devDependency matching existing Capacitor plugin convention"
patterns_established:
  - "Dynamic import with top-level await for test modules that need vi.mock hoisting"
observability_surfaces:
  - "none (plugin installation only — observability surfaces added in T02+)"
duration: 15m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Install plugin, sync native projects, create test scaffolding

**Installed `@capgo/native-purchases@8.2.2`, synced native iOS/Android projects with Capacitor 8 SPM, and created the purchase-plugin test scaffolding with all 4 test groups.**

## What Happened

1. Installed `@capgo/native-purchases@8.2.2` as devDependency in `apps/mobile` via `pnpm add -D`.
2. Ran `npx cap sync` — completed successfully, detecting 9 Capacitor plugins on both iOS and Android. The plugin was auto-registered in `Package.swift` (no manual entry needed).
3. Verified Android integration: `capacitor.settings.gradle` includes `capgo-native-purchases`, `capacitor.build.gradle` has the implementation dependency, and `capacitor.plugins.json` registers the plugin class.
4. Created test file with 4 test groups matching the task plan: product ID constants (5 assertions), function exports (7 assertions), platform guard behavior (5 assertions), and type re-exports (2 assertions).
5. Confirmed test file is discovered by Vitest and fails with expected import error (`Cannot find module '/src/lib/services/purchase-plugin.js'`) — T02 will create the module.

**Key risk retired:** `@capgo/native-purchases@8.2.2` is fully compatible with Capacitor 8.2.0 + SPM. `cap sync` handled the registration automatically on both platforms.

## Verification

- `pnpm add -D @capgo/native-purchases@8.2.2` — exit 0
- `npx cap sync` — exit 0, 9 plugins found on both iOS and Android
- `grep CapgoNativePurchases apps/mobile/ios/App/CapApp-SPM/Package.swift` — 2 matches (dependency + target)
- `Package.swift` has exactly 9 `.package(name:` entries
- Android `capacitor.settings.gradle` and `capacitor.build.gradle` include native-purchases
- Test file exists and is syntactically valid
- `pnpm test -- --run src/lib/services/__tests__/purchase-plugin.test.ts` — test discovered, fails with expected `Cannot find module` error
- `pnpm run build` — succeeds (build not broken by plugin installation)

### Slice-level verification status (T01 of 4):
- `pnpm --filter mobile test` — partial (16/17 suites pass; purchase-plugin test fails as expected — needs T02)
- `pnpm run build` — PASS
- `npx cap sync` — PASS (Package.swift includes CapgoNativePurchases)
- Manual iOS build / StoreKit test — not yet applicable (T03-T04)

## Diagnostics

- Check plugin installation: `grep '@capgo/native-purchases' apps/mobile/package.json`
- Check iOS SPM registration: `grep CapgoNativePurchases apps/mobile/ios/App/CapApp-SPM/Package.swift`
- Check Android registration: `grep native-purchases apps/mobile/android/capacitor.settings.gradle`
- Re-sync native projects: `cd apps/mobile && npx cap sync`

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/package.json` — added `@capgo/native-purchases@8.2.2` to devDependencies
- `apps/mobile/ios/App/CapApp-SPM/Package.swift` — auto-updated by cap sync with CapgoNativePurchases as 9th plugin entry
- `apps/mobile/android/capacitor.settings.gradle` — auto-updated by cap sync with native-purchases project
- `apps/mobile/android/app/capacitor.build.gradle` — auto-updated by cap sync with native-purchases implementation
- `apps/mobile/android/app/src/main/assets/capacitor.plugins.json` — auto-updated by cap sync
- `apps/mobile/src/lib/services/__tests__/purchase-plugin.test.ts` — new test file with 4 test groups (19 assertions)

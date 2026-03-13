---
estimated_steps: 5
estimated_files: 4
---

# T01: Install plugin, sync native projects, create test scaffolding

**Slice:** S01 — IAP Plugin Integration & First Purchase Flow
**Milestone:** M003

## Description

Retires the highest risk in M003: proving `@capgo/native-purchases` works with Capacitor 8 + SPM. Installs the plugin, syncs native projects, and creates the test file that validates the wrapper module (T02). Tests are expected to fail after this task because the wrapper module doesn't exist yet — that's correct.

## Steps

1. Install `@capgo/native-purchases@8.2.2` as a devDependency in `apps/mobile` using `pnpm add -D @capgo/native-purchases@8.2.2`
2. Run `npx cap sync` from `apps/mobile` directory. Verify it completes without errors. Check `ios/App/CapApp-SPM/Package.swift` — it should now have 9 entries including `CapgoNativePurchases`. If it wasn't auto-added, manually add following the existing pattern (look at how other `@capgo` packages like `CapgoCapacitorFastSql` are registered).
3. Verify the Android side was also updated by checking that `android/app/build.gradle` or its dependency chain includes the native-purchases dependency (cap sync handles this).
4. Create `apps/mobile/src/lib/services/__tests__/purchase-plugin.test.ts` with the following test groups:
   - **Product ID constants:** Assert `PRODUCT_IDS.PREMIUM_ANNUAL` equals `'com.fitlog.app.premium.annual'`, `PRODUCT_IDS.PREMIUM_MONTHLY` equals `'com.fitlog.app.premium.monthly'`, `PRODUCT_IDS.TEMPLATE_PACK` equals `'com.fitlog.app.templates.pack'`. Assert `PLAN_IDS.ANNUAL` and `PLAN_IDS.MONTHLY` exist for Android.
   - **Function exports:** Assert all 7 wrapper functions are exported and are functions: `isBillingSupported`, `getProducts`, `getProduct`, `purchaseProduct`, `getPurchases`, `restorePurchases`, `manageSubscriptions`.
   - **Platform guard behavior:** Mock `Capacitor.isNativePlatform()` to return false. Assert `isBillingSupported()` returns `false`. Assert `getProducts()` returns empty array. Assert `purchaseProduct()` returns `null`. Assert `getPurchases()` returns empty array. Assert `restorePurchases()` returns empty array.
   - **Type re-exports:** Assert `PURCHASE_TYPE` enum is re-exported with `INAPP` and `SUBS` values.
5. Run `pnpm --filter mobile test` to confirm the test file is discovered by Vitest but fails (import errors since the module doesn't exist yet). This confirms the test scaffolding is correct.

## Must-Haves

- [ ] `@capgo/native-purchases@8.2.2` in `devDependencies` of `apps/mobile/package.json`
- [ ] `npx cap sync` completes without errors
- [ ] `Package.swift` has `CapgoNativePurchases` as the 9th plugin dependency
- [ ] Test file exists at `apps/mobile/src/lib/services/__tests__/purchase-plugin.test.ts` with all test groups
- [ ] Test file runs in Vitest (may fail due to missing module — that's expected)

## Verification

- `pnpm install` succeeds from repo root
- `npx cap sync` from `apps/mobile` exits 0
- `grep CapgoNativePurchases apps/mobile/ios/App/CapApp-SPM/Package.swift` returns matches
- Test file exists and is syntactically valid: `pnpm --filter mobile test -- --run src/lib/services/__tests__/purchase-plugin.test.ts 2>&1 | head -20` shows test discovery (failures expected)

## Observability Impact

- Signals added/changed: None (plugin installation only)
- How a future agent inspects this: Check `Package.swift` for plugin entry, check `package.json` for dependency, run `npx cap sync` to verify clean sync
- Failure state exposed: `cap sync` errors would indicate Cap 8 incompatibility — the exact risk this task retires

## Inputs

- `apps/mobile/package.json` — current devDependencies list
- `apps/mobile/ios/App/CapApp-SPM/Package.swift` — current 8-entry SPM manifest
- S01 research: plugin version, peer dep compatibility, SPM registration pattern

## Expected Output

- `apps/mobile/package.json` — updated with `@capgo/native-purchases@8.2.2` devDependency
- `apps/mobile/ios/App/CapApp-SPM/Package.swift` — updated with 9th plugin entry for `CapgoNativePurchases`
- `apps/mobile/src/lib/services/__tests__/purchase-plugin.test.ts` — complete test file with all assertions (initially failing)
- Native projects synced (ios + android)

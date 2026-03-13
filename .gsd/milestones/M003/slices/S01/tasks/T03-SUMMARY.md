---
id: T03
parent: S01
milestone: M003
provides:
  - "iOS App.entitlements with In-App Purchase capability"
  - "Products.storekit StoreKit testing configuration with 3 products matching PRODUCT_IDS"
  - "project.pbxproj updated with entitlements reference and CODE_SIGN_ENTITLEMENTS in Debug+Release"
key_files:
  - apps/mobile/ios/App/App/App.entitlements
  - apps/mobile/ios/App/App/Products.storekit
  - apps/mobile/ios/App/App.xcodeproj/project.pbxproj
key_decisions:
  - "StoreKit config uses version 4.0 format with DEU storefront for German-first locale alignment"
  - "Subscription group named 'Premium' with annual at groupNumber 1 (higher priority) and monthly at groupNumber 2"
patterns_established:
  - "pbxproj file references use A1B2C3D42DB1000100IAP0xx pattern for IAP-related entries"
observability_surfaces:
  - "none — native config files only; StoreKit testing requires selecting Products.storekit in Xcode scheme → Run → Options → StoreKit Configuration"
duration: 10m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T03: Add iOS entitlements and StoreKit testing configuration

**Created iOS In-App Purchase entitlement, StoreKit testing configuration with 3 localized products (de+en), and updated project.pbxproj with entitlements references.**

## What Happened

Created `App.entitlements` with the `com.apple.developer.in-app-purchases` capability. Created `Products.storekit` (StoreKit configuration v4.0) with all 3 products matching T02's `PRODUCT_IDS` exactly:

- Subscription group "Premium" with:
  - `com.fitlog.app.premium.annual` — auto-renewable, 1 year, €29.99
  - `com.fitlog.app.premium.monthly` — auto-renewable, 1 month, €3.99
- `com.fitlog.app.templates.pack` — non-consumable, €4.99

All products include localized display names and descriptions in both `de` and `en`.

Updated `project.pbxproj` surgically: added PBXFileReference entries for both files, added both to the App PBXGroup, and set `CODE_SIGN_ENTITLEMENTS = App/App.entitlements` in both Debug and Release build configurations for the App target.

## Verification

- `test -f apps/mobile/ios/App/App/App.entitlements` → OK
- `test -f apps/mobile/ios/App/App/Products.storekit` → OK
- `grep CODE_SIGN_ENTITLEMENTS project.pbxproj` → 2 matches (Debug + Release)
- `grep App.entitlements project.pbxproj` → 4 matches (file ref, group, 2x build settings)
- `grep Products.storekit project.pbxproj` → 2 matches (file ref, group)
- `pnpm --filter mobile build` → succeeded (Vite build unaffected by native file changes)
- `pnpm --filter mobile test` → 373 tests passed (17 files)

### Slice-level checks:
- ✅ `pnpm --filter mobile test` — all 373 tests pass
- ✅ `pnpm --filter mobile build` — succeeds
- ⬜ `npx cap sync` — not re-run (no npm dependency changes since T01)
- ⬜ Manual Xcode StoreKit testing — requires developer action (T04 provides the UI)

## Diagnostics

Native config files only — no runtime diagnostics. To inspect:
- Check entitlements: `plutil -p apps/mobile/ios/App/App/App.entitlements`
- Check StoreKit products: `python3 -c "import json; print(json.dumps(json.load(open('apps/mobile/ios/App/App/Products.storekit')), indent=2))"`
- Check pbxproj refs: `grep -c "App.entitlements\|Products.storekit\|CODE_SIGN_ENTITLEMENTS" apps/mobile/ios/App/App.xcodeproj/project.pbxproj` (expect 8)

If StoreKit testing fails at runtime (`getProducts()` returns empty), verify:
1. `Products.storekit` is selected in Xcode scheme → Run → Options → StoreKit Configuration
2. Product IDs in `.storekit` match `PRODUCT_IDS` in `purchase-plugin.ts`

## Deviations

None

## Known Issues

None

## Files Created/Modified

- `apps/mobile/ios/App/App/App.entitlements` — created: IAP capability plist
- `apps/mobile/ios/App/App/Products.storekit` — created: StoreKit testing config with 3 products
- `apps/mobile/ios/App/App.xcodeproj/project.pbxproj` — modified: added file references, group entries, CODE_SIGN_ENTITLEMENTS

---
estimated_steps: 4
estimated_files: 3
---

# T03: Add iOS entitlements and StoreKit testing configuration

**Slice:** S01 — IAP Plugin Integration & First Purchase Flow
**Milestone:** M003

## Description

Creates the iOS-side prerequisites for StoreKit sandbox testing: the In-App Purchase entitlement file and a StoreKit testing configuration with 3 test products. Without the entitlement, `getProducts()` returns empty and `purchaseProduct()` fails silently. Without the `.storekit` file, there are no products to test against in the Xcode simulator. Also updates `project.pbxproj` to reference the entitlements file.

## Steps

1. Create `apps/mobile/ios/App/App/App.entitlements` as a property list with the `com.apple.developer.in-app-purchases` key set to boolean true. Standard Xcode entitlements plist format:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
       <key>com.apple.developer.in-app-purchases</key>
       <true/>
   </dict>
   </plist>
   ```
2. Create `apps/mobile/ios/App/App/Products.storekit` StoreKit testing configuration file with 3 products. The `.storekit` file is JSON format. Define:
   - Subscription group "Premium" containing:
     - `com.fitlog.app.premium.annual` — auto-renewable subscription, 1 year, reference price €29.99
     - `com.fitlog.app.premium.monthly` — auto-renewable subscription, 1 month, reference price €3.99
   - Non-consumable:
     - `com.fitlog.app.templates.pack` — one-time purchase, reference price €4.99
   - Include both `de` and `en` localized display names and descriptions for each product
   - Set the StoreKit configuration version and settings fields appropriately
3. Update `apps/mobile/ios/App/App.xcodeproj/project.pbxproj` to:
   - Add `App.entitlements` to the file references (PBXFileReference section)
   - Add `Products.storekit` to the file references
   - Add both files to the appropriate PBXGroup (the "App" group)
   - Set `CODE_SIGN_ENTITLEMENTS = App/App.entitlements` in both Debug and Release build settings for the App target
   - Be surgical with pbxproj edits — this format is fragile. Match existing patterns exactly.
4. Verify: `pnpm --filter mobile build` still succeeds. Confirm files exist at expected paths. Grep pbxproj for `App.entitlements` reference and `CODE_SIGN_ENTITLEMENTS` setting.

## Must-Haves

- [ ] `App.entitlements` exists with IAP capability
- [ ] `Products.storekit` exists with 3 products matching `PRODUCT_IDS` from T02
- [ ] Subscription group "Premium" contains both annual and monthly subscriptions
- [ ] Localized display names in de + en for all 3 products
- [ ] `project.pbxproj` references entitlements file in build settings
- [ ] `pnpm --filter mobile build` succeeds (TypeScript/Vite build unaffected by native file changes)

## Verification

- `test -f apps/mobile/ios/App/App/App.entitlements && echo "OK"` — entitlements file exists
- `test -f apps/mobile/ios/App/App/Products.storekit && echo "OK"` — storekit config exists
- `grep "CODE_SIGN_ENTITLEMENTS" apps/mobile/ios/App/App.xcodeproj/project.pbxproj` — returns matches
- `grep "App.entitlements" apps/mobile/ios/App/App.xcodeproj/project.pbxproj` — returns matches
- `pnpm --filter mobile build` — succeeds

## Observability Impact

- Signals added/changed: None (native config files only)
- How a future agent inspects this: Check file existence, grep pbxproj for entitlements reference. If StoreKit testing fails, verify the `.storekit` file is selected in Xcode scheme → Run → Options → StoreKit Configuration (manual Xcode step, not automatable in headless build).
- Failure state exposed: Missing entitlement → `getProducts()` returns empty array (observable via T04 dev UI). Missing storekit config in scheme → same symptom.

## Inputs

- `apps/mobile/ios/App/App.xcodeproj/project.pbxproj` — current Xcode project structure
- `apps/mobile/ios/App/App/Info.plist` — existing plist confirming de/en localizations
- T02's `PRODUCT_IDS` constants — product identifiers that storekit config must match exactly
- S01 research: Product ID convention table, StoreKit configuration requirements

## Expected Output

- `apps/mobile/ios/App/App/App.entitlements` — IAP entitlement plist
- `apps/mobile/ios/App/App/Products.storekit` — StoreKit testing configuration with 3 products
- `apps/mobile/ios/App/App.xcodeproj/project.pbxproj` — updated with entitlements reference and both new files

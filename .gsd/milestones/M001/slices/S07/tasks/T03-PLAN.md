---
estimated_steps: 5
estimated_files: 5
---

# T03: Native platform localization (iOS & Android)

**Slice:** S07 — i18n & Launch Readiness
**Milestone:** M001

## Description

Without native localization files, the app name on the device home screen and app drawer won't translate based on device language. iOS needs `de.lproj/InfoPlist.strings` and `en.lproj/InfoPlist.strings` files plus `CFBundleLocalizations` in Info.plist. Android needs `values-de/strings.xml`. The `CFBundleDevelopmentRegion` must also be updated from `en` to `de` to match the base locale.

## Steps

1. Edit `apps/mobile/ios/App/App/Info.plist`: change `CFBundleDevelopmentRegion` from `en` to `de`. Add a `CFBundleLocalizations` array key with items `de` and `en` to declare supported localizations.
2. Create `apps/mobile/ios/App/App/de.lproj/InfoPlist.strings` with `CFBundleDisplayName = "FitLog";` and `CFBundleName = "FitLog";`. This is the German localization (app name is the same in both languages — it's a brand name).
3. Create `apps/mobile/ios/App/App/en.lproj/InfoPlist.strings` with the same content. Both localizations use "FitLog" as the display name.
4. Create `apps/mobile/android/app/src/main/res/values-de/strings.xml` with the same `app_name` and `title_activity_main` values as the existing `values/strings.xml`. Since "FitLog" is a brand name, the values are identical but the file must exist for Android to recognize German as a supported language.
5. Verify all files exist, are well-formed, and `pnpm build` still succeeds.

## Must-Haves

- [ ] `CFBundleDevelopmentRegion` is `de` in Info.plist
- [ ] `CFBundleLocalizations` array contains `de` and `en` in Info.plist
- [ ] `de.lproj/InfoPlist.strings` exists with `CFBundleDisplayName` and `CFBundleName`
- [ ] `en.lproj/InfoPlist.strings` exists with `CFBundleDisplayName` and `CFBundleName`
- [ ] `values-de/strings.xml` exists with `app_name` and `title_activity_main`
- [ ] `pnpm build` succeeds

## Verification

- `test -f apps/mobile/ios/App/App/de.lproj/InfoPlist.strings` exits 0
- `test -f apps/mobile/ios/App/App/en.lproj/InfoPlist.strings` exits 0
- `test -f apps/mobile/android/app/src/main/res/values-de/strings.xml` exits 0
- `grep "CFBundleDevelopmentRegion" apps/mobile/ios/App/App/Info.plist` shows `de`
- `grep "CFBundleLocalizations" apps/mobile/ios/App/App/Info.plist` matches
- `cd apps/mobile && pnpm build` succeeds

## Observability Impact

- Signals added/changed: None at runtime — these are build-time/install-time platform configuration files
- How a future agent inspects this: Check file existence with `find`/`test`; inspect Info.plist for localization entries; check Android res directories
- Failure state exposed: Missing lproj files cause iOS to not show localized app name; missing values-de causes Android to always use default English strings — visible only on device

## Inputs

- `apps/mobile/ios/App/App/Info.plist` — current Info.plist with `CFBundleDevelopmentRegion = en`, no CFBundleLocalizations
- `apps/mobile/android/app/src/main/res/values/strings.xml` — existing English strings to mirror for German
- S07 Research — identified required native localization structure

## Expected Output

- `apps/mobile/ios/App/App/Info.plist` — updated with `de` development region and localizations array
- `apps/mobile/ios/App/App/de.lproj/InfoPlist.strings` — new file with localized app name
- `apps/mobile/ios/App/App/en.lproj/InfoPlist.strings` — new file with localized app name
- `apps/mobile/android/app/src/main/res/values-de/strings.xml` — new file with German app name

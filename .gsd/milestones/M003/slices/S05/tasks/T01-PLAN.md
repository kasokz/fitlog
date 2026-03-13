---
estimated_steps: 5
estimated_files: 7
---

# T01: Fastlane config scaffold for com.fitlog.app

**Slice:** S05 — App Store & Play Store Listing Optimization
**Milestone:** M003

## Description

Adapt the production-proven fastlane configuration from the yahtzee reference project for FitLog. This creates the full deployment infrastructure: Fastfile with all iOS/Android lanes, Appfile with app identifiers, Matchfile for certificate management, Pluginfile for the Android versioning plugin, .env.example documenting all required secrets, and keys/.gitkeep for the API key directory.

The Fastfile is ~2300 lines and nearly identical to the reference — all lanes are generic Capacitor deployment lanes. The only changes are the app identifier (`com.fitlog.app`) in Appfile/Matchfile and verifying the .gitignore already covers the right patterns.

## Steps

1. Copy `references/yahtzee/apps/mobile/fastlane/Fastfile` to `apps/mobile/fastlane/Fastfile` verbatim — the Fastfile is app-identifier-agnostic (reads from Appfile via `CredentialsManager::AppfileConfig`), no changes needed.
2. Create `apps/mobile/fastlane/Appfile` adapted from yahtzee: replace `com.pokeresquedice.app` with `com.fitlog.app` in both iOS `app_identifier()` and Android `package_name()`.
3. Create `apps/mobile/fastlane/Matchfile` adapted from yahtzee: replace `com.pokeresquedice.app` with `com.fitlog.app` in `app_identifier()`.
4. Create `apps/mobile/fastlane/Pluginfile` with `gem 'fastlane-plugin-versioning_android'` (verbatim from reference).
5. Create `apps/mobile/fastlane/.env.example` adapted from yahtzee — same content, documentation is generic. Verify `apps/mobile/fastlane/.gitignore` already has the correct patterns (keys, screenshot PNGs, android PNGs). Create `apps/mobile/fastlane/keys/.gitkeep`.

## Must-Haves

- [ ] Fastfile exists with all iOS and Android deployment lanes
- [ ] Appfile references `com.fitlog.app` for both iOS and Android
- [ ] Matchfile references `com.fitlog.app`
- [ ] Pluginfile includes `fastlane-plugin-versioning_android`
- [ ] .env.example documents all required environment variables
- [ ] `keys/.gitkeep` exists for API key storage
- [ ] .gitignore covers keys/, screenshot PNGs, and android metadata PNGs

## Verification

- `test -f apps/mobile/fastlane/Fastfile && test -f apps/mobile/fastlane/Appfile && test -f apps/mobile/fastlane/Matchfile && test -f apps/mobile/fastlane/Pluginfile && test -f apps/mobile/fastlane/.env.example && test -f apps/mobile/fastlane/keys/.gitkeep && echo "All files exist"`
- `grep -c "com.fitlog.app" apps/mobile/fastlane/Appfile` returns 2
- `grep "com.fitlog.app" apps/mobile/fastlane/Matchfile` returns a match
- `grep "fastlane-plugin-versioning_android" apps/mobile/fastlane/Pluginfile`

## Inputs

- `references/yahtzee/apps/mobile/fastlane/Fastfile` — Complete reference Fastfile
- `references/yahtzee/apps/mobile/fastlane/Appfile` — Reference Appfile with yahtzee identifiers
- `references/yahtzee/apps/mobile/fastlane/Matchfile` — Reference Matchfile with yahtzee identifiers
- `references/yahtzee/apps/mobile/fastlane/Pluginfile` — Reference Pluginfile
- `references/yahtzee/apps/mobile/fastlane/.env.example` — Reference env var documentation
- `references/yahtzee/apps/mobile/fastlane/.gitignore` — Reference gitignore patterns
- `apps/mobile/capacitor.config.ts` — Confirms appId is `com.fitlog.app`

## Expected Output

- `apps/mobile/fastlane/Fastfile` — Complete deployment automation with all lanes
- `apps/mobile/fastlane/Appfile` — App identifiers for `com.fitlog.app`
- `apps/mobile/fastlane/Matchfile` — Certificate management config for `com.fitlog.app`
- `apps/mobile/fastlane/Pluginfile` — Android versioning plugin declaration
- `apps/mobile/fastlane/.env.example` — Documented env var template
- `apps/mobile/fastlane/keys/.gitkeep` — Placeholder for API key directory

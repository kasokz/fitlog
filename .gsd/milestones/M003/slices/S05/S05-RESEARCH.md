# S05: App Store & Play Store Listing Optimization — Research

**Date:** 2026-03-13

## Summary

S05 is a metadata-and-config slice — no runtime code changes except replacing the placeholder legal URLs in `paywall-constants.ts` (D082). The reference project (yahtzee) provides a production-proven fastlane setup with identical tech stack (Capacitor + SvelteKit + pnpm monorepo) that maps directly to FitLog's needs. The work is: create the full `fastlane/` directory structure (Fastfile, Appfile, Matchfile, Pluginfile, .env.example, metadata directories), write store listing content in de-DE + en-US for both platforms, configure age rating and review information for a subscription fitness app, set up screenshot frameit pipeline scaffolding, and replace the placeholder privacy/terms URLs.

The primary constraint is that FitLog is a **subscription app** — Apple has specific review requirements beyond a typical app: subscription terms display (already handled in S03 paywall), restore purchases button (already in settings from S03), and review notes must explain the subscription model. The App Store category is `HEALTH_AND_FITNESS` which flags the `healthOrWellnessTopics` age rating field. Android metadata structure differs from iOS (title/short_description/full_description vs name/subtitle/description/keywords) and uses underscore-delimited locale codes internally but hyphen-delimited in directory names per supply conventions.

Screenshot capture itself is a manual/device step — S05 creates the pipeline scaffolding (Framefile.json, .gitkeep files, keyword/title .strings files) so that when screenshots are captured (manually or via fastlane snapshot/screengrab in S06), the framing and upload pipeline is ready. The actual screenshot PNGs are gitignored per the reference pattern.

## Recommendation

**Approach:** Mirror the yahtzee reference project's fastlane structure exactly, adapting identifiers and content for FitLog. The reference is production-proven on the same stack.

**Deliverables by task:**

1. **Fastlane config scaffold** — Fastfile, Appfile, Matchfile, Pluginfile, .env.example adapted from yahtzee with `com.fitlog.app` identifiers. The Fastfile includes all lanes (iOS: dev, certificates, deploy_internal, beta_dryrun, promote_to_production, update_metadata, screenshots; Android: dev, deploy_internal, promote lanes, update_metadata, screenshots; Shared: sync_capacitor, verify_setup, custom_frame_screenshots).

2. **iOS metadata** — `metadata/ios/` with de-DE and en-US directories containing: name.txt, subtitle.txt, description.txt, keywords.txt, promotional_text.txt, release_notes.txt, privacy_url.txt, support_url.txt, marketing_url.txt. Plus non-localized: copyright.txt, primary_category.txt, age_rating_declaration.json, review_information/*.txt.

3. **Android metadata** — `metadata/android/` with de-DE and en-US directories containing: title.txt, short_description.txt, full_description.txt, changelogs/default.txt. Plus images/phoneScreenshots/.gitkeep per locale.

4. **Screenshot pipeline** — `screenshots/` with Framefile.json, background.png placeholder, fonts/, and per-locale keyword.strings + title.strings files.

5. **Legal URL replacement** — Update `paywall-constants.ts` placeholders (D082) to real fitlog.app URLs.

6. **Docs** — Deployment workflow documentation adapted from yahtzee reference.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Full fastlane config for Capacitor app | yahtzee reference project (`references/yahtzee/apps/mobile/fastlane/`) | Production-proven, identical tech stack, covers iOS + Android with all lanes |
| iOS metadata submission | fastlane `deliver` | Industry standard; reads from `metadata/ios/{locale}/*.txt` file structure |
| Android metadata submission | fastlane `supply` | Same fastlane toolchain; reads from `metadata/android/{locale}/*.txt` |
| Screenshot framing | fastlane `frameit` | Adds device mockups + marketing text from Framefile.json config |
| Android version management | `fastlane-plugin-versioning_android` | Plugin for reading/writing versionCode and versionName in build.gradle |
| iOS certificate management | fastlane `match` | Encrypted git storage for certificates, eliminates code signing issues |
| Build + upload automation | fastlane `gym` (iOS) + `gradle` (Android) | Standard build actions with signing config |

## Existing Code and Patterns

- `references/yahtzee/apps/mobile/fastlane/Fastfile` — Complete Fastfile with all lanes for both platforms. Adapt by changing app identifier from `com.pokeresquedice.app` to `com.fitlog.app`. All lanes are directly reusable. The `sync_capacitor` helper lane uses `ENV["PROJECT_ROOT"]` set to parent of fastlane/ dir.
- `references/yahtzee/apps/mobile/fastlane/Appfile` — App identifier config. Replace bundle ID. Keeps iOS and Android sections with env vars.
- `references/yahtzee/apps/mobile/fastlane/Matchfile` — Match config for certificate management. Replace app_identifier array.
- `references/yahtzee/apps/mobile/fastlane/.env.example` — Comprehensive env var documentation for all required secrets (Apple ID, team IDs, API keys, keystore, service account).
- `references/yahtzee/apps/mobile/fastlane/metadata/ios/de-DE/` — Reference for iOS metadata file set per locale. Each locale needs: name.txt, subtitle.txt, description.txt, keywords.txt, promotional_text.txt, release_notes.txt, privacy_url.txt, support_url.txt, marketing_url.txt.
- `references/yahtzee/apps/mobile/fastlane/metadata/android/de-DE/` — Reference for Android metadata file set per locale. Each locale needs: title.txt, short_description.txt, full_description.txt, changelogs/default.txt, images/phoneScreenshots/.gitkeep.
- `references/yahtzee/apps/mobile/fastlane/metadata/ios/age_rating_declaration.json` — Age rating template. FitLog needs `healthOrWellnessTopics: true` since it's a fitness app. All violence/sex/gambling fields stay NONE.
- `references/yahtzee/apps/mobile/fastlane/metadata/ios/review_information/` — Review contact info + notes. FitLog notes must explain subscription model and how to test premium features.
- `references/yahtzee/apps/mobile/fastlane/screenshots/Framefile.json` — Frameit config for adding device mockups to screenshots. Adapt titles and keywords for FitLog screens.
- `references/yahtzee/apps/mobile/fastlane/.gitignore` — Gitignores keys/, screenshot PNGs (except background), Android screenshot PNGs.
- `references/yahtzee/apps/mobile/fastlane/Pluginfile` — Contains `gem 'fastlane-plugin-versioning_android'`. Required for Android version management lanes.
- `apps/mobile/src/lib/components/premium/paywall-constants.ts` — Contains placeholder URLs (`https://fitlog.app/privacy`, `https://fitlog.app/terms`). D082 says S05 must replace with real URLs. These are the same domain — the pages just need to exist.
- `apps/mobile/Gemfile` — Already references fastlane and Pluginfile path. Ready for use.
- `apps/mobile/fastlane/.gitignore` — Already exists with correct patterns from initial scaffold.
- `apps/mobile/capacitor.config.ts` — `appId: 'com.fitlog.app'`, `appName: 'FitLog'`.
- `apps/mobile/ios/App/App/Info.plist` — `CFBundleDevelopmentRegion: de`, `CFBundleLocalizations: [de, en]`.

## Constraints

- **No emojis in store metadata** — AGENTS.md explicitly prohibits emojis in metadata text. All descriptions, keywords, what's-new text must be emoji-free.
- **iOS locale code for fastlane deliver:** `de-DE` and `en-US` — Must match `Deliver::Languages::ALL_LANGUAGES` exactly.
- **Android locale code for fastlane supply:** `de-DE` and `en-US` — Must match `Supply::Languages::ALL_LANGUAGES` exactly.
- **App Store description max:** 4000 characters. **Subtitle max:** 30 characters. **Keywords max:** 100 characters comma-separated. **Promotional text max:** 170 characters.
- **Google Play short_description max:** 80 characters. **full_description max:** 4000 characters. **title max:** 30 characters.
- **Subscription app review requirements** — Apple requires: (1) subscription terms near purchase button (done in S03 paywall), (2) restore purchases button (done in S03 settings), (3) review notes explaining subscription. Missing any → rejection.
- **Privacy policy URL required** — Both stores require a privacy policy URL for apps with IAP. Must be a real, accessible web page before submission.
- **Terms of service URL required** — Apple requires ToS URL for subscription apps. Must be accessible before submission.
- **healthOrWellnessTopics age rating** — FitLog tracks body weight and workout data. Apple's `healthOrWellnessTopics` must be `true` in age_rating_declaration.json.
- **First iOS submission** — The `release_notes.txt` content will be ignored for the very first version (deliver skips it). The description serves as the only store text for v1.0.
- **deliver metadata_path** — The iOS promote_to_production lane uses `metadata_path: "./fastlane/metadata/ios"` (relative to fastlane/ dir where lanes run). Android supply reads from default `./fastlane/metadata/android`.
- **Version 1.0** — Current `MARKETING_VERSION = 1.0` and `versionCode = 1`. First store submission.
- **Legal page hosting** — The URLs `https://fitlog.app/privacy` and `https://fitlog.app/terms` need actual hosted pages. Creating the hosting is outside S05 scope (infrastructure), but the URLs must be defined and consistent. S05 ensures the constants file points to the right domain and the metadata files reference the same URLs.

## Common Pitfalls

- **Wrong locale directory names → fastlane rejects** — iOS uses hyphenated `de-DE`, `en-US`. Android supply also uses hyphenated `de-DE`, `en-US`. Using underscored names (`de_DE`) for iOS would cause `Unsupported directory name(s)` error. The supply languages list uses underscores internally but the directory convention uses hyphens.
- **Keywords with spaces after commas → wasted characters** — iOS keywords are comma-separated. Spaces after commas count against the 100-character limit. Use `keyword1,keyword2,keyword3` not `keyword1, keyword2, keyword3`.
- **Subtitle too long → App Store Connect rejection** — 30 character limit is strict. German is typically longer than English. Must verify both locales fit.
- **Missing review_information for subscription app → slower review** — Apple manual review for subscriptions checks subscription terms, restore button, and pricing. Detailed review notes accelerate the review.
- **Not setting healthOrWellnessTopics → age rating mismatch** — Apple may flag the app during review if it tracks health data but the age rating doesn't declare it. Set `healthOrWellnessTopics: true`.
- **Hardcoded background.png reference in Framefile but no file → frameit crash** — Framefile.json references `./background.png`. Must create a placeholder background image even if real screenshots aren't ready yet.
- **Google Play requires at least one screenshot per locale** — Can't push metadata without screenshots. The `.gitkeep` files are placeholders; actual screenshots needed before `fastlane supply` upload works.
- **Missing Pluginfile → android_set_version_name/code undefined** — The Fastfile uses `android_set_version_name` and `android_set_version_code` from `fastlane-plugin-versioning_android`. Without the Pluginfile declaring this gem, `bundle install` won't install it and those actions will fail.

## Open Risks

- **Privacy policy / ToS pages don't exist yet** — The URLs `https://fitlog.app/privacy` and `https://fitlog.app/terms` need real hosted pages before store submission (S06). S05 defines the URLs consistently across metadata and code, but hosting the pages is a prerequisite for S06. The user needs to set up a simple static site or use a hosted legal page generator. This is a blocker for S06 submission, not S05 preparation.
- **Screenshot content not ready** — Real screenshots require the app running on device/simulator with representative data. S05 creates the pipeline scaffolding but actual screenshots are an S06 task or a manual human task. Store submission in S06 needs at least iPhone 6.7" and iPhone 6.5" screenshots for iOS, and phone screenshots for Android.
- **German descriptions may exceed character limits** — German text is typically 15-30% longer than English. Store descriptions must be tested against character limits (4000 for description, 30 for subtitle, 80 for Google Play short_description).
- **Fastlane env vars not configured** — The .env.example documents all required secrets but actual values require Apple Developer Portal access, App Store Connect API key generation, Google Play service account setup, and match certificate repository creation. These are user-dependent prerequisites for S06, not S05 blockers.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| App Store Optimization | `sickn33/antigravity-awesome-skills@app-store-optimization` (664 installs) | available — high install count, directly relevant to store listing content optimization |
| App Store Optimization | `alirezarezvani/claude-skills@app-store-optimization` (182 installs) | available — alternative ASO skill |
| Capacitor Best Practices | `cap-go/capacitor-skills@capacitor-best-practices` (296 installs) | available — same vendor as IAP plugin, general Capacitor guidance |
| Capacitor App Store | `cap-go/capacitor-skills@capacitor-app-store` (78 installs) | available — directly relevant to Capacitor store submission |
| Fastlane | `willsigmon/sigstack@fastlane expert` (14 installs) | available — low install count but directly relevant |

**Recommendation:** Consider installing `sickn33/antigravity-awesome-skills@app-store-optimization` (664 installs) for store listing content quality — it may help with keyword research and description optimization. The yahtzee reference project provides the structural pattern, but ASO content quality is a separate skill. The Capacitor skills are lower priority since the reference project already proves the fastlane+Capacitor integration.

## Sources

- yahtzee reference project `references/yahtzee/apps/mobile/fastlane/` — Full production fastlane config for identical tech stack (Capacitor 8 + SvelteKit + pnpm). Provides Fastfile, Appfile, Matchfile, Pluginfile, .env.example, metadata structure, screenshot pipeline, and deployment documentation.
- fastlane deliver source `references/fastlane/deliver/lib/deliver/upload_metadata.rb` — Metadata file structure: localized version values (description, keywords, release_notes, support_url, marketing_url, promotional_text), localized app values (name, subtitle, privacy_url), non-localized (copyright), review information directory.
- fastlane deliver languages `references/fastlane/deliver/lib/deliver/languages.rb` — Supported iOS locales including `de-DE` and `en-US`.
- fastlane supply source `references/fastlane/supply/lib/supply.rb` — Android metadata fields: title, short_description, full_description, video. Image types: featureGraphic, icon, tvBanner. Screenshot types: phoneScreenshots, sevenInchScreenshots, etc.
- fastlane supply languages `references/fastlane/supply/lib/supply/languages.rb` — Supported Android locales including `de_DE` and `en_US` (underscore format).
- fastlane supply setup `references/fastlane/supply/lib/supply/setup.rb` — Metadata download structure: language dirs, AVAILABLE_METADATA_FIELDS per-file, CHANGELOGS_FOLDER_NAME, IMAGES_FOLDER_NAME.
- App Store Connect category mapping `references/fastlane/spaceship/lib/spaceship/connect_api/models/app_category.rb` — `Healthcare_Fitness` maps to `HEALTH_AND_FITNESS`.
- Existing codebase: `paywall-constants.ts` (D082 placeholder URLs), `purchase-plugin.ts` (product IDs), `capacitor.config.ts` (app ID), `Info.plist` (locales), `build.gradle` (package name/version).

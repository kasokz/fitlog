# S05: App Store & Play Store Listing Optimization

**Goal:** App metadata (descriptions, keywords, screenshots pipeline, what's-new text) is prepared for both stores in de + en localizations via fastlane configuration. Privacy policy and terms of service URLs are set. Store assets are ready for submission.
**Demo:** `find apps/mobile/fastlane/metadata -type f | wc -l` shows 30+ metadata files. Fastlane config files (Fastfile, Appfile, Matchfile, Pluginfile, .env.example) exist and are adapted for `com.fitlog.app`. iOS descriptions fit within 4000 chars, subtitles within 30 chars, keywords within 100 chars. Android titles within 30 chars, short descriptions within 80 chars. No emojis in any metadata text. `paywall-constants.ts` legal URLs are finalized.

## Must-Haves

- Fastfile with all lanes (iOS: dev, certificates, deploy_internal, beta_dryrun, promote_to_production, update_metadata, screenshots; Android: dev, deploy_internal, promote lanes, update_metadata, screenshots; Shared: sync_capacitor, verify_setup, custom_frame_screenshots) adapted from yahtzee reference for `com.fitlog.app`
- Appfile, Matchfile, Pluginfile, .env.example adapted for `com.fitlog.app`
- iOS metadata in `de-DE` and `en-US` locales: name, subtitle, description, keywords, promotional_text, release_notes, privacy_url, support_url, marketing_url
- iOS non-localized: copyright.txt, primary_category.txt, age_rating_declaration.json (with `healthOrWellnessTopics: true`), review_information/ with subscription-aware notes
- Android metadata in `de-DE` and `en-US` locales: title, short_description, full_description, changelogs/default.txt
- Screenshot pipeline scaffolding: Framefile.json (iOS + Android), background placeholder, font files, per-locale keyword/title .strings
- All character limits respected (iOS subtitle 30, keywords 100, description 4000; Android title 30, short_description 80, full_description 4000)
- Zero emojis in any metadata text
- `paywall-constants.ts` legal URL comments updated to mark them as finalized for store submission
- DEPLOYMENT_WORKFLOW.md adapted from yahtzee reference

## Verification

- `find apps/mobile/fastlane/metadata/ios -type f | wc -l` >= 20
- `find apps/mobile/fastlane/metadata/android -type f | wc -l` >= 8
- `wc -c < apps/mobile/fastlane/metadata/ios/de-DE/subtitle.txt` <= 30
- `wc -c < apps/mobile/fastlane/metadata/ios/en-US/subtitle.txt` <= 30
- `wc -c < apps/mobile/fastlane/metadata/ios/de-DE/keywords.txt` <= 100
- `wc -c < apps/mobile/fastlane/metadata/ios/en-US/keywords.txt` <= 100
- `wc -c < apps/mobile/fastlane/metadata/android/de-DE/title.txt` <= 30
- `wc -c < apps/mobile/fastlane/metadata/android/en-US/title.txt` <= 30
- `wc -c < apps/mobile/fastlane/metadata/android/de-DE/short_description.txt` <= 80
- `wc -c < apps/mobile/fastlane/metadata/android/en-US/short_description.txt` <= 80
- `grep -r "healthOrWellnessTopics.*true" apps/mobile/fastlane/metadata/ios/age_rating_declaration.json`
- `grep -rP '[\x{1F600}-\x{1F64F}\x{1F300}-\x{1F5FF}\x{1F680}-\x{1F6FF}\x{1F1E0}-\x{1F1FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]' apps/mobile/fastlane/metadata/` returns empty
- `test -f apps/mobile/fastlane/Fastfile && test -f apps/mobile/fastlane/Appfile && test -f apps/mobile/fastlane/Matchfile && test -f apps/mobile/fastlane/Pluginfile && test -f apps/mobile/fastlane/.env.example`
- `grep "com.fitlog.app" apps/mobile/fastlane/Appfile`
- `test -f apps/mobile/fastlane/screenshots/Framefile.json`
- `pnpm run build` passes (paywall-constants.ts change doesn't break build)

## Tasks

- [x] **T01: Fastlane config scaffold for com.fitlog.app** `est:45m`
  - Why: The infrastructure layer — all deployment lanes, certificate management, env var documentation. Everything S06 needs to actually run `fastlane deliver` and `fastlane supply`.
  - Files: `apps/mobile/fastlane/Fastfile`, `apps/mobile/fastlane/Appfile`, `apps/mobile/fastlane/Matchfile`, `apps/mobile/fastlane/Pluginfile`, `apps/mobile/fastlane/.env.example`, `apps/mobile/fastlane/.gitignore`, `apps/mobile/fastlane/keys/.gitkeep`
  - Do: Adapt all config files from `references/yahtzee/apps/mobile/fastlane/`, replacing `com.pokeresquedice.app` with `com.fitlog.app` throughout. Fastfile keeps all lanes verbatim (they're generic Capacitor lanes). Appfile, Matchfile updated with FitLog identifiers. .gitignore already exists — verify it matches reference pattern. Create `keys/.gitkeep`.
  - Verify: `grep -c "com.fitlog.app" apps/mobile/fastlane/Appfile` returns 2 (iOS + Android). `grep "com.fitlog.app" apps/mobile/fastlane/Matchfile`. All 5 config files exist.
  - Done when: Fastfile, Appfile, Matchfile, Pluginfile, .env.example, keys/.gitkeep all exist with `com.fitlog.app` identifiers

- [x] **T02: Store listing metadata (iOS + Android, de + en) and legal URL finalization** `est:60m`
  - Why: The content layer — actual store listing text that users and reviewers will see. This is the creative/content-heavy task. Also updates `paywall-constants.ts` to mark legal URLs as finalized and writes review information for Apple's subscription review.
  - Files: `apps/mobile/fastlane/metadata/ios/de-DE/*.txt`, `apps/mobile/fastlane/metadata/ios/en-US/*.txt`, `apps/mobile/fastlane/metadata/ios/copyright.txt`, `apps/mobile/fastlane/metadata/ios/primary_category.txt`, `apps/mobile/fastlane/metadata/ios/age_rating_declaration.json`, `apps/mobile/fastlane/metadata/ios/review_information/*.txt`, `apps/mobile/fastlane/metadata/android/de-DE/*.txt`, `apps/mobile/fastlane/metadata/android/en-US/*.txt`, `apps/mobile/src/lib/components/premium/paywall-constants.ts`
  - Do: Write localized metadata for iOS (name, subtitle, description, keywords, promotional_text, release_notes, privacy_url, support_url, marketing_url) in de-DE and en-US. Write iOS non-localized files (copyright, primary_category=HEALTH_AND_FITNESS, age_rating with healthOrWellnessTopics=true). Write review_information with subscription-aware notes explaining the annual analytics subscription and template pack one-time purchase. Write Android metadata (title, short_description, full_description, changelogs/default.txt) in de-DE and en-US. Create `.gitkeep` in Android screenshot dirs. Validate all character limits. Update paywall-constants.ts comments to mark URLs as store-submission-ready. Zero emojis in all text.
  - Verify: All character limit checks pass. `grep -rP '[\x{1F600}-\x{1F64F}]' apps/mobile/fastlane/metadata/` empty. `pnpm run build` passes.
  - Done when: 30+ metadata files exist across iOS and Android, all within character limits, no emojis, age rating declares healthOrWellnessTopics true, review notes explain subscription model

- [x] **T03: Screenshot pipeline scaffolding and deployment docs** `est:30m`
  - Why: Sets up the frameit pipeline so S06 can capture real screenshots and have them automatically framed with marketing text. Also provides deployment workflow documentation for the user.
  - Files: `apps/mobile/fastlane/screenshots/Framefile.json`, `apps/mobile/fastlane/screenshots/background.png`, `apps/mobile/fastlane/screenshots/fonts/Roboto-Bold.ttf`, `apps/mobile/fastlane/screenshots/fonts/Roboto-Medium.ttf`, `apps/mobile/fastlane/screenshots/de-DE/keyword.strings`, `apps/mobile/fastlane/screenshots/de-DE/title.strings`, `apps/mobile/fastlane/screenshots/en-US/.gitkeep`, `apps/mobile/fastlane/metadata/android/Framefile.json`, `apps/mobile/fastlane/DEPLOYMENT_WORKFLOW.md`
  - Do: Create iOS Framefile.json with FitLog-specific screenshot titles/keywords (6 screenshots: workout logging, exercise library, analytics dashboard, PR tracking, programs, paywall). Copy Roboto font files from yahtzee reference. Create per-locale keyword.strings and title.strings for de-DE (German marketing text). Create en-US .gitkeep. Create Android Framefile.json. Create a 1x1 placeholder background.png. Write DEPLOYMENT_WORKFLOW.md adapted from yahtzee reference covering iOS and Android deployment steps.
  - Verify: `test -f apps/mobile/fastlane/screenshots/Framefile.json`. `test -f apps/mobile/fastlane/screenshots/background.png`. `test -f apps/mobile/fastlane/DEPLOYMENT_WORKFLOW.md`. Font files exist.
  - Done when: Screenshot pipeline is scaffolded with FitLog-specific frameit config, fonts, and per-locale strings. Deployment workflow doc exists.

## Files Likely Touched

- `apps/mobile/fastlane/Fastfile`
- `apps/mobile/fastlane/Appfile`
- `apps/mobile/fastlane/Matchfile`
- `apps/mobile/fastlane/Pluginfile`
- `apps/mobile/fastlane/.env.example`
- `apps/mobile/fastlane/.gitignore`
- `apps/mobile/fastlane/keys/.gitkeep`
- `apps/mobile/fastlane/metadata/ios/de-DE/*.txt` (9 files)
- `apps/mobile/fastlane/metadata/ios/en-US/*.txt` (9 files)
- `apps/mobile/fastlane/metadata/ios/copyright.txt`
- `apps/mobile/fastlane/metadata/ios/primary_category.txt`
- `apps/mobile/fastlane/metadata/ios/age_rating_declaration.json`
- `apps/mobile/fastlane/metadata/ios/review_information/*.txt` (7 files)
- `apps/mobile/fastlane/metadata/android/de-DE/*.txt` (3 files + changelog)
- `apps/mobile/fastlane/metadata/android/en-US/*.txt` (3 files + changelog)
- `apps/mobile/fastlane/metadata/android/de-DE/images/phoneScreenshots/.gitkeep`
- `apps/mobile/fastlane/metadata/android/en-US/images/phoneScreenshots/.gitkeep`
- `apps/mobile/fastlane/metadata/android/Framefile.json`
- `apps/mobile/fastlane/screenshots/Framefile.json`
- `apps/mobile/fastlane/screenshots/background.png`
- `apps/mobile/fastlane/screenshots/fonts/Roboto-Bold.ttf`
- `apps/mobile/fastlane/screenshots/fonts/Roboto-Medium.ttf`
- `apps/mobile/fastlane/screenshots/de-DE/keyword.strings`
- `apps/mobile/fastlane/screenshots/de-DE/title.strings`
- `apps/mobile/fastlane/screenshots/en-US/.gitkeep`
- `apps/mobile/fastlane/DEPLOYMENT_WORKFLOW.md`
- `apps/mobile/src/lib/components/premium/paywall-constants.ts`

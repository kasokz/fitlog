---
id: S05
parent: M003
milestone: M003
provides:
  - Complete fastlane deployment infrastructure adapted for com.fitlog.app (Fastfile, Appfile, Matchfile, Pluginfile, .env.example)
  - iOS localized metadata (de-DE + en-US) — name, subtitle, description, keywords, promotional_text, release_notes, privacy/support/marketing URLs
  - iOS non-localized metadata — copyright, primary_category (HEALTH_AND_FITNESS), age_rating_declaration (healthOrWellnessTopics true), review_information with subscription-aware notes
  - Android metadata (de-DE + en-US) — title, short_description, full_description, changelogs
  - Frameit screenshot pipeline (iOS + Android) with 6 FitLog-specific entries, Roboto fonts, per-locale marketing strings
  - DEPLOYMENT_WORKFLOW.md covering iOS + Android deployment, metadata-only updates, and troubleshooting
  - paywall-constants.ts legal URL comments updated to finalized for store submission
requires:
  - slice: S03
    provides: Paywall UI for screenshot framing context and subscription terms for store descriptions
  - slice: S04
    provides: Premium template names/descriptions for store listing feature highlights
affects:
  - S06
key_files:
  - apps/mobile/fastlane/Fastfile
  - apps/mobile/fastlane/Appfile
  - apps/mobile/fastlane/Matchfile
  - apps/mobile/fastlane/metadata/ios/de-DE/description.txt
  - apps/mobile/fastlane/metadata/ios/en-US/description.txt
  - apps/mobile/fastlane/metadata/ios/age_rating_declaration.json
  - apps/mobile/fastlane/metadata/ios/review_information/notes.txt
  - apps/mobile/fastlane/metadata/android/de-DE/full_description.txt
  - apps/mobile/fastlane/metadata/android/en-US/full_description.txt
  - apps/mobile/fastlane/screenshots/Framefile.json
  - apps/mobile/fastlane/DEPLOYMENT_WORKFLOW.md
key_decisions:
  - Fastfile copied verbatim from yahtzee — all lanes are app-identifier-agnostic (read from Appfile via CredentialsManager)
  - Store descriptions follow structured format listing all 8 templates by name with free/premium labels
  - Review notes detail both purchase types (subscription + template pack) for Apple reviewer
  - Screenshot pipeline covers 6 key screens aligned with store description feature highlights
  - German metadata uses ae/oe/ue (ASCII) per AGENTS.md convention for store metadata files
patterns_established:
  - Fastlane config adapted from yahtzee reference via sed substitution of app identifier
  - Framefile.json data entries use filter "01"-"06" matching screenshot filenames to be captured in S06
  - Store descriptions structured as core features, template listing, analytics premium section, design qualities, premium options with terms
observability_surfaces:
  - none — static metadata and config files
drill_down_paths:
  - .gsd/milestones/M003/slices/S05/tasks/T01-SUMMARY.md
  - .gsd/milestones/M003/slices/S05/tasks/T02-SUMMARY.md
  - .gsd/milestones/M003/slices/S05/tasks/T03-SUMMARY.md
duration: ~35m
verification_result: passed
completed_at: 2026-03-13
---

# S05: App Store & Play Store Listing Optimization

**Complete store listing metadata (40 files), fastlane deployment infrastructure, screenshot pipeline, and deployment docs — all adapted for com.fitlog.app with de + en localizations and zero emojis.**

## What Happened

Three tasks built the full store submission infrastructure:

**T01 (Fastlane config):** Copied production-proven fastlane config from the yahtzee reference project. Fastfile (2309 lines with all iOS/Android deployment lanes) was verbatim since lanes are app-identifier-agnostic. Appfile and Matchfile were adapted via sed to replace `com.pokeresquedice.app` with `com.fitlog.app`. Pluginfile and .env.example copied as-is. Created keys/.gitkeep.

**T02 (Store metadata):** Created 38 metadata files across iOS and Android. iOS gets 9 localized files per locale (de-DE, en-US): app name, subtitle (29 chars — 1 under limit), full description highlighting RIR-based progression and all 8 templates by name, optimized keywords, promotional text, release notes, and legal URLs. Non-localized: copyright, HEALTH_AND_FITNESS category, age rating with healthOrWellnessTopics true. Review information includes 7 files with notes explaining both the annual analytics subscription and one-time template pack purchase. Android mirrors iOS content adapted for Play Store conventions (no auto-renewal legal boilerplate). Updated paywall-constants.ts comments to mark legal URLs as finalized.

**T03 (Screenshot pipeline + docs):** Built frameit screenshot pipeline with iOS and Android Framefile.json configs, each with 6 entries covering workout tracking, exercise library, strength curves, PR tracking, programs, and premium analytics. Copied Roboto fonts, created de-DE keyword/title .strings with German marketing text. Created 1x1 placeholder background.png. Wrote DEPLOYMENT_WORKFLOW.md covering full iOS/Android deployment flow, metadata-only updates, version management, and troubleshooting.

## Verification

All 16 slice-level checks pass:
- iOS metadata: 28 files (>= 20 required)
- Android metadata: 12 files (>= 8 required)
- iOS de-DE subtitle: 29 chars (<= 30)
- iOS en-US subtitle: 29 chars (<= 30)
- iOS de-DE keywords: 79 chars (<= 100)
- iOS en-US keywords: 73 chars (<= 100)
- Android de-DE title: 24 chars (<= 30)
- Android en-US title: 24 chars (<= 30)
- Android de-DE short_description: 73 chars (<= 80)
- Android en-US short_description: 79 chars (<= 80)
- healthOrWellnessTopics: true in age_rating_declaration.json
- No emojis in any metadata file
- All 5 fastlane config files exist
- com.fitlog.app in Appfile
- screenshots/Framefile.json exists
- `pnpm run build` passes

## Requirements Advanced

- R024 (App Store / Play Store Optimization) — Store listings prepared with optimized metadata, keywords, descriptions in de + en. Screenshot pipeline scaffolded. Privacy policy and terms URLs set. Ready for S06 submission.

## Requirements Validated

- None — store listing quality requires actual submission and review (S06 scope)

## New Requirements Surfaced

- None

## Requirements Invalidated or Re-scoped

- None

## Deviations

- Added background.png to `metadata/android/` as well since the Android Framefile.json references `./background.png` relative to its own directory (not in original plan but required for frameit to work)
- Added "Metadata-Only Updates" section to DEPLOYMENT_WORKFLOW.md (not in yahtzee reference) for common store listing update operations
- Appfile grep count is 3 (not 2 as planned) — the lane-override comment section also contains the identifier, which is correct

## Known Limitations

- Legal URLs (privacy, terms, support) point to `fitlog.app` domain — actual pages must be created before store submission
- Screenshot pipeline has placeholder background.png (1x1 pixel) — real screenshots captured in S06
- Font files are copies from yahtzee reference — Roboto is open-source (Apache 2.0) so no licensing concern
- German metadata uses ASCII ae/oe/ue instead of Umlaute — standard practice for plain-text store metadata files

## Follow-ups

- S06: Capture real screenshots on physical devices and run frameit pipeline
- S06: Execute `fastlane deliver` and `fastlane supply` to push metadata to stores
- Legal pages at fitlog.app/privacy, fitlog.app/terms, fitlog.app/support must exist before production submission

## Files Created/Modified

- `apps/mobile/fastlane/Fastfile` — Complete deployment automation (2309 lines)
- `apps/mobile/fastlane/Appfile` — App identifiers for com.fitlog.app
- `apps/mobile/fastlane/Matchfile` — Certificate management config
- `apps/mobile/fastlane/Pluginfile` — Android versioning plugin
- `apps/mobile/fastlane/.env.example` — Environment variable documentation
- `apps/mobile/fastlane/keys/.gitkeep` — API key directory placeholder
- `apps/mobile/fastlane/metadata/ios/de-DE/*.txt` — 9 localized iOS metadata files (German)
- `apps/mobile/fastlane/metadata/ios/en-US/*.txt` — 9 localized iOS metadata files (English)
- `apps/mobile/fastlane/metadata/ios/copyright.txt` — "2026 Long Bui"
- `apps/mobile/fastlane/metadata/ios/primary_category.txt` — HEALTH_AND_FITNESS
- `apps/mobile/fastlane/metadata/ios/age_rating_declaration.json` — Age rating with health topics
- `apps/mobile/fastlane/metadata/ios/review_information/*.txt` — 7 review info files
- `apps/mobile/fastlane/metadata/android/de-DE/*.txt` — Title, short/full description, changelog (German)
- `apps/mobile/fastlane/metadata/android/en-US/*.txt` — Title, short/full description, changelog (English)
- `apps/mobile/fastlane/metadata/android/*/images/phoneScreenshots/.gitkeep` — Screenshot placeholders
- `apps/mobile/fastlane/screenshots/Framefile.json` — iOS frameit config (6 entries)
- `apps/mobile/fastlane/metadata/android/Framefile.json` — Android frameit config (6 entries)
- `apps/mobile/fastlane/screenshots/background.png` — Placeholder background
- `apps/mobile/fastlane/screenshots/fonts/Roboto-*.ttf` — Frameit fonts
- `apps/mobile/fastlane/screenshots/de-DE/keyword.strings` — German screenshot keywords
- `apps/mobile/fastlane/screenshots/de-DE/title.strings` — German screenshot titles
- `apps/mobile/fastlane/screenshots/en-US/.gitkeep` — English locale placeholder
- `apps/mobile/fastlane/metadata/android/background.png` — Android frameit background
- `apps/mobile/fastlane/metadata/fonts/Roboto-*.ttf` — Android frameit fonts
- `apps/mobile/fastlane/DEPLOYMENT_WORKFLOW.md` — Deployment guide
- `apps/mobile/src/lib/components/premium/paywall-constants.ts` — Legal URL comments finalized

## Forward Intelligence

### What the next slice should know
- All fastlane lanes are ready to run — S06 needs only to fill in `.env` values (Apple credentials, Google keystore) and execute `fastlane deliver` / `fastlane supply`
- Screenshot Framefile entries expect files named with filters "01" through "06" — capture screenshots matching these 6 screens
- DEPLOYMENT_WORKFLOW.md documents the full flow including prerequisites

### What's fragile
- Legal URLs (fitlog.app/privacy, fitlog.app/terms) are placeholder domains — Apple will reject if pages don't exist at review time
- Android Framefile references fonts via `../fonts/` relative path — moving the Framefile will break font resolution

### Authoritative diagnostics
- `find apps/mobile/fastlane/metadata -type f | wc -l` — should be 40+ total files
- `wc -c` on character-limited files — all within App Store / Play Store limits

### What assumptions changed
- Appfile has 3 occurrences of com.fitlog.app (not 2 as planned) — the lane-override comment section also uses it, which is correct behavior from the yahtzee reference

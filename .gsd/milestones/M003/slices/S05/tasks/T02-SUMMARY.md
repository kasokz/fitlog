---
id: T02
parent: S05
milestone: M003
provides:
  - iOS localized metadata (de-DE + en-US) — 9 files per locale (name, subtitle, description, keywords, promotional_text, release_notes, privacy_url, support_url, marketing_url)
  - iOS non-localized metadata — copyright, primary_category (HEALTH_AND_FITNESS), age_rating_declaration with healthOrWellnessTopics true
  - iOS review_information — 7 files with subscription-aware notes explaining premium subscription + template pack
  - Android metadata (de-DE + en-US) — title, short_description, full_description, changelogs/default.txt, images/phoneScreenshots/.gitkeep per locale
  - paywall-constants.ts comments updated from placeholder to finalized for store submission
key_files:
  - apps/mobile/fastlane/metadata/ios/de-DE/description.txt
  - apps/mobile/fastlane/metadata/ios/en-US/description.txt
  - apps/mobile/fastlane/metadata/ios/age_rating_declaration.json
  - apps/mobile/fastlane/metadata/ios/review_information/notes.txt
  - apps/mobile/fastlane/metadata/android/de-DE/full_description.txt
  - apps/mobile/fastlane/metadata/android/en-US/full_description.txt
  - apps/mobile/src/lib/components/premium/paywall-constants.ts
key_decisions:
  - German descriptions use ae/oe/ue instead of Umlaute per AGENTS.md preference in metadata text files (store metadata files are plain ASCII)
  - Review notes detail both purchase types — monthly/annual subscription for analytics, one-time template pack for 5 premium templates
  - iOS subtitle at 29 chars (1 char under limit) — "Trainingslog mit RIR-Tracking" (de) / "Workout Log with RIR Tracking" (en)
patterns_established:
  - Store descriptions follow structure: core features, 8 templates listed by name with free/premium labels, analytics premium section, design qualities, premium options with subscription terms
  - Android descriptions omit App Store auto-renewal legal text (Google Play handles this separately)
observability_surfaces:
  - none — static metadata files
duration: ~12m
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T02: Store listing metadata (iOS + Android, de + en) and legal URL finalization

**Created 38 store listing metadata files across iOS and Android for de-DE and en-US, with subscription-aware review notes and finalized legal URLs.**

## What Happened

Created iOS metadata for de-DE and en-US (9 localized files each): app name, subtitle (29 chars both locales), description highlighting RIR-based progression, 8 program templates (3 free + 5 premium named individually), analytics dashboard, and premium subscription terms. Keywords optimized for discoverability without spaces after commas (79 chars de, 73 chars en).

Created iOS non-localized metadata: copyright ("2026 Long Bui"), primary_category (HEALTH_AND_FITNESS), age_rating_declaration.json adapted from yahtzee reference with `healthOrWellnessTopics: true`. Review information includes 7 files with notes explaining both premium subscription (monthly/annual for analytics) and one-time template pack purchase, plus testing instructions.

Created Android metadata for both locales: title (24 chars), short_description (73/79 chars), full_description matching iOS content without App Store legal boilerplate, changelogs, and screenshot .gitkeep placeholders.

Updated paywall-constants.ts comments from "placeholder" to "finalized for store submission" — URL values unchanged.

## Verification

- Character limits all pass: iOS subtitles 29/30, keywords 79+73/100, descriptions 2269+2051/4000, Android titles 24/30, short_descriptions 73+79/80
- `grep "healthOrWellnessTopics.*true"` — PASS
- `grep "HEALTH_AND_FITNESS"` — PASS
- Emoji check (grep -rP unicode ranges) — PASS (empty result)
- Keywords space check — PASS (no spaces after commas)
- Total file count: 38 (>= 28 required)
- iOS file count: 28 (>= 20), Android file count: 10 (>= 8)
- `pnpm run build` — PASS (26.96s, no errors)
- Fastlane config files exist — PASS (Fastfile, Appfile, Matchfile, Pluginfile, .env.example)
- `grep "com.fitlog.app" Appfile` — PASS

### Slice-level verification status (13/14 checks):
- [x] iOS files >= 20 (28)
- [x] Android files >= 8 (10)
- [x] iOS de-DE subtitle <= 30 (29)
- [x] iOS en-US subtitle <= 30 (29)
- [x] iOS de-DE keywords <= 100 (79)
- [x] iOS en-US keywords <= 100 (73)
- [x] Android de-DE title <= 30 (24)
- [x] Android en-US title <= 30 (24)
- [x] Android de-DE short_description <= 80 (73)
- [x] Android en-US short_description <= 80 (79)
- [x] healthOrWellnessTopics true
- [x] No emojis
- [x] Fastlane config files exist + Appfile has com.fitlog.app
- [ ] Framefile.json — T03 scope (screenshot pipeline)

## Diagnostics

None — static metadata files. Verify with `find apps/mobile/fastlane/metadata -type f | wc -l` and `wc -c` on character-limited files.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/fastlane/metadata/ios/de-DE/name.txt` — App name "FitLog"
- `apps/mobile/fastlane/metadata/ios/de-DE/subtitle.txt` — "Trainingslog mit RIR-Tracking" (29 chars)
- `apps/mobile/fastlane/metadata/ios/de-DE/description.txt` — Full German app description (2269 chars)
- `apps/mobile/fastlane/metadata/ios/de-DE/keywords.txt` — German keywords (79 chars)
- `apps/mobile/fastlane/metadata/ios/de-DE/promotional_text.txt` — German promotional text
- `apps/mobile/fastlane/metadata/ios/de-DE/release_notes.txt` — German release notes
- `apps/mobile/fastlane/metadata/ios/de-DE/privacy_url.txt` — https://fitlog.app/privacy
- `apps/mobile/fastlane/metadata/ios/de-DE/support_url.txt` — https://fitlog.app/support
- `apps/mobile/fastlane/metadata/ios/de-DE/marketing_url.txt` — https://fitlog.app
- `apps/mobile/fastlane/metadata/ios/en-US/name.txt` — App name "FitLog"
- `apps/mobile/fastlane/metadata/ios/en-US/subtitle.txt` — "Workout Log with RIR Tracking" (29 chars)
- `apps/mobile/fastlane/metadata/ios/en-US/description.txt` — Full English app description (2051 chars)
- `apps/mobile/fastlane/metadata/ios/en-US/keywords.txt` — English keywords (73 chars)
- `apps/mobile/fastlane/metadata/ios/en-US/promotional_text.txt` — English promotional text
- `apps/mobile/fastlane/metadata/ios/en-US/release_notes.txt` — English release notes
- `apps/mobile/fastlane/metadata/ios/en-US/privacy_url.txt` — https://fitlog.app/privacy
- `apps/mobile/fastlane/metadata/ios/en-US/support_url.txt` — https://fitlog.app/support
- `apps/mobile/fastlane/metadata/ios/en-US/marketing_url.txt` — https://fitlog.app
- `apps/mobile/fastlane/metadata/ios/copyright.txt` — "2026 Long Bui"
- `apps/mobile/fastlane/metadata/ios/primary_category.txt` — HEALTH_AND_FITNESS
- `apps/mobile/fastlane/metadata/ios/age_rating_declaration.json` — Age rating with healthOrWellnessTopics: true
- `apps/mobile/fastlane/metadata/ios/review_information/first_name.txt` — Long
- `apps/mobile/fastlane/metadata/ios/review_information/last_name.txt` — Bui
- `apps/mobile/fastlane/metadata/ios/review_information/email_address.txt` — hello@long-bui.de
- `apps/mobile/fastlane/metadata/ios/review_information/phone_number.txt` — +49 15221847808
- `apps/mobile/fastlane/metadata/ios/review_information/demo_user.txt` — Empty (no login required)
- `apps/mobile/fastlane/metadata/ios/review_information/demo_password.txt` — Empty (no login required)
- `apps/mobile/fastlane/metadata/ios/review_information/notes.txt` — Subscription-aware review notes with testing instructions
- `apps/mobile/fastlane/metadata/android/de-DE/title.txt` — "FitLog - Workout Tracker" (24 chars)
- `apps/mobile/fastlane/metadata/android/de-DE/short_description.txt` — German short description (73 chars)
- `apps/mobile/fastlane/metadata/android/de-DE/full_description.txt` — Full German description (2069 chars)
- `apps/mobile/fastlane/metadata/android/de-DE/changelogs/default.txt` — German release notes
- `apps/mobile/fastlane/metadata/android/de-DE/images/phoneScreenshots/.gitkeep` — Screenshot placeholder
- `apps/mobile/fastlane/metadata/android/en-US/title.txt` — "FitLog - Workout Tracker" (24 chars)
- `apps/mobile/fastlane/metadata/android/en-US/short_description.txt` — English short description (79 chars)
- `apps/mobile/fastlane/metadata/android/en-US/full_description.txt` — Full English description (1896 chars)
- `apps/mobile/fastlane/metadata/android/en-US/changelogs/default.txt` — English release notes
- `apps/mobile/fastlane/metadata/android/en-US/images/phoneScreenshots/.gitkeep` — Screenshot placeholder
- `apps/mobile/src/lib/components/premium/paywall-constants.ts` — Comments updated from placeholder to finalized

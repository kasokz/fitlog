---
estimated_steps: 5
estimated_files: 30
---

# T02: Store listing metadata (iOS + Android, de + en) and legal URL finalization

**Slice:** S05 — App Store & Play Store Listing Optimization
**Milestone:** M003

## Description

Write all store listing content for both App Store and Play Store in German (de-DE) and English (en-US). This is the content-heavy task: app descriptions highlighting FitLog's features (RIR-based progression, 8 program templates including 5 premium, workout logging, analytics dashboard), keywords optimized for discoverability, promotional text, and release notes.

Also creates iOS non-localized metadata (copyright, primary category, age rating with `healthOrWellnessTopics: true` for a fitness app), review information with subscription-aware notes explaining the annual analytics subscription and one-time template pack purchase, and updates `paywall-constants.ts` to mark legal URLs as finalized.

Key constraints: zero emojis, German text must fit within tighter character limits (German is ~20% longer than English), iOS subtitle max 30 chars, iOS keywords max 100 chars (no spaces after commas), Android title max 30 chars, Android short_description max 80 chars.

## Steps

1. Create iOS localized metadata directories and files for `de-DE`: name.txt ("FitLog"), subtitle.txt (max 30 chars), description.txt (max 4000 chars — comprehensive feature description), keywords.txt (max 100 chars, comma-separated no spaces), promotional_text.txt (max 170 chars), release_notes.txt, privacy_url.txt, support_url.txt, marketing_url.txt.
2. Create iOS localized metadata for `en-US`: same file set, English translations. Verify subtitle fits 30 chars (English is shorter, should be fine).
3. Create iOS non-localized metadata: `copyright.txt` ("2026 Long Bui"), `primary_category.txt` ("HEALTH_AND_FITNESS"), `age_rating_declaration.json` (copy from yahtzee, set `healthOrWellnessTopics: true`), review_information/ directory with all 7 files (first_name, last_name, email_address, phone_number, demo_user, demo_password, notes.txt — notes must explain subscription model and how to test premium features).
4. Create Android metadata for `de-DE` and `en-US`: title.txt (max 30 chars), short_description.txt (max 80 chars), full_description.txt (max 4000 chars), changelogs/default.txt, images/phoneScreenshots/.gitkeep per locale.
5. Update `apps/mobile/src/lib/components/premium/paywall-constants.ts` — change comments from "placeholder" to "finalized for store submission" to reflect that these are the canonical URLs. The actual URL values (`https://fitlog.app/privacy`, `https://fitlog.app/terms`) remain unchanged. Validate all character limits with `wc -c`.

## Must-Haves

- [ ] iOS de-DE metadata: 9 files (name, subtitle, description, keywords, promotional_text, release_notes, privacy_url, support_url, marketing_url)
- [ ] iOS en-US metadata: 9 files (same set)
- [ ] iOS subtitle <= 30 chars in both locales
- [ ] iOS keywords <= 100 chars in both locales, no spaces after commas
- [ ] iOS description <= 4000 chars in both locales
- [ ] iOS non-localized: copyright.txt, primary_category.txt (HEALTH_AND_FITNESS), age_rating_declaration.json with healthOrWellnessTopics: true
- [ ] iOS review_information: 7 files including subscription-aware notes.txt
- [ ] Android de-DE metadata: title.txt, short_description.txt, full_description.txt, changelogs/default.txt
- [ ] Android en-US metadata: same 4 files
- [ ] Android title <= 30 chars, short_description <= 80 chars in both locales
- [ ] Zero emojis in all metadata text
- [ ] paywall-constants.ts updated to mark URLs as finalized
- [ ] `pnpm run build` passes

## Verification

- Character limit checks: `wc -c` on subtitle, keywords, title, short_description files
- `grep "healthOrWellnessTopics.*true" apps/mobile/fastlane/metadata/ios/age_rating_declaration.json`
- `grep "HEALTH_AND_FITNESS" apps/mobile/fastlane/metadata/ios/primary_category.txt`
- `grep -rP '[\x{1F600}-\x{1F64F}\x{1F300}-\x{1F5FF}\x{1F680}-\x{1F6FF}\x{1F1E0}-\x{1F1FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]' apps/mobile/fastlane/metadata/` returns empty
- `pnpm run build` succeeds
- `find apps/mobile/fastlane/metadata -type f | wc -l` >= 28

## Inputs

- `references/yahtzee/apps/mobile/fastlane/metadata/` — Reference metadata file structure
- `references/yahtzee/apps/mobile/fastlane/metadata/ios/age_rating_declaration.json` — Age rating template (needs healthOrWellnessTopics change)
- `references/yahtzee/apps/mobile/fastlane/metadata/ios/review_information/` — Review info structure
- S04 summary — 8 templates (3 free + 5 premium), template names for store description
- S03 outputs — Paywall with subscription terms, restore purchases in settings
- `apps/mobile/src/lib/components/premium/paywall-constants.ts` — Current placeholder URLs
- `apps/mobile/capacitor.config.ts` — appName: 'FitLog'

## Expected Output

- `apps/mobile/fastlane/metadata/ios/de-DE/` — 9 localized metadata files
- `apps/mobile/fastlane/metadata/ios/en-US/` — 9 localized metadata files
- `apps/mobile/fastlane/metadata/ios/copyright.txt`
- `apps/mobile/fastlane/metadata/ios/primary_category.txt`
- `apps/mobile/fastlane/metadata/ios/age_rating_declaration.json`
- `apps/mobile/fastlane/metadata/ios/review_information/` — 7 files
- `apps/mobile/fastlane/metadata/android/de-DE/` — title, short_description, full_description, changelogs/default.txt, images/phoneScreenshots/.gitkeep
- `apps/mobile/fastlane/metadata/android/en-US/` — same structure
- `apps/mobile/src/lib/components/premium/paywall-constants.ts` — Comments updated

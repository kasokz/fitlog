# S05: App Store & Play Store Listing Optimization — UAT

**Milestone:** M003
**Written:** 2026-03-13

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This slice produces static metadata files, config files, and documentation — no runtime behavior. All verification is file existence, character limits, and content correctness.

## Preconditions

- Repository checked out with S05 changes
- `pnpm run build` passes (confirms paywall-constants.ts change doesn't break build)

## Smoke Test

`find apps/mobile/fastlane/metadata -type f | wc -l` returns 40+ files. `test -f apps/mobile/fastlane/Fastfile` succeeds.

## Test Cases

### 1. Fastlane config files exist and are adapted

1. Run `ls apps/mobile/fastlane/{Fastfile,Appfile,Matchfile,Pluginfile,.env.example}`
2. Run `grep "com.fitlog.app" apps/mobile/fastlane/Appfile`
3. Run `grep "com.fitlog.app" apps/mobile/fastlane/Matchfile`
4. Run `grep -c "pokeresquedice" apps/mobile/fastlane/Appfile apps/mobile/fastlane/Matchfile`
5. **Expected:** All 5 files exist. Appfile and Matchfile reference com.fitlog.app. Zero occurrences of pokeresquedice.

### 2. iOS metadata character limits

1. Run `wc -c < apps/mobile/fastlane/metadata/ios/de-DE/subtitle.txt` — expect <= 30
2. Run `wc -c < apps/mobile/fastlane/metadata/ios/en-US/subtitle.txt` — expect <= 30
3. Run `wc -c < apps/mobile/fastlane/metadata/ios/de-DE/keywords.txt` — expect <= 100
4. Run `wc -c < apps/mobile/fastlane/metadata/ios/en-US/keywords.txt` — expect <= 100
5. Run `wc -c < apps/mobile/fastlane/metadata/ios/de-DE/description.txt` — expect <= 4000
6. Run `wc -c < apps/mobile/fastlane/metadata/ios/en-US/description.txt` — expect <= 4000
7. **Expected:** All within App Store Connect limits.

### 3. Android metadata character limits

1. Run `wc -c < apps/mobile/fastlane/metadata/android/de-DE/title.txt` — expect <= 30
2. Run `wc -c < apps/mobile/fastlane/metadata/android/en-US/title.txt` — expect <= 30
3. Run `wc -c < apps/mobile/fastlane/metadata/android/de-DE/short_description.txt` — expect <= 80
4. Run `wc -c < apps/mobile/fastlane/metadata/android/en-US/short_description.txt` — expect <= 80
5. **Expected:** All within Play Store limits.

### 4. Age rating and category

1. Run `cat apps/mobile/fastlane/metadata/ios/age_rating_declaration.json | grep healthOrWellnessTopics`
2. Run `cat apps/mobile/fastlane/metadata/ios/primary_category.txt`
3. **Expected:** healthOrWellnessTopics is true. Category is HEALTH_AND_FITNESS.

### 5. No emojis in any metadata

1. Run `grep -rP '[\x{1F600}-\x{1F64F}\x{1F300}-\x{1F5FF}\x{1F680}-\x{1F6FF}\x{1F1E0}-\x{1F1FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]' apps/mobile/fastlane/metadata/`
2. **Expected:** Empty output (no matches).

### 6. Review information covers subscription model

1. Read `apps/mobile/fastlane/metadata/ios/review_information/notes.txt`
2. **Expected:** Notes explain the annual analytics subscription and one-time template pack purchase. Includes testing instructions for Apple reviewer.

### 7. Screenshot pipeline scaffolded

1. Run `test -f apps/mobile/fastlane/screenshots/Framefile.json && echo OK`
2. Run `python3 -c "import json; d=json.load(open('apps/mobile/fastlane/screenshots/Framefile.json')); print(len(d['data']))"`
3. Run `test -f apps/mobile/fastlane/screenshots/background.png && echo OK`
4. Run `ls apps/mobile/fastlane/screenshots/fonts/`
5. **Expected:** Framefile.json exists with 6 data entries. background.png exists. Roboto-Bold.ttf and Roboto-Medium.ttf present.

### 8. Deployment workflow documentation

1. Read `apps/mobile/fastlane/DEPLOYMENT_WORKFLOW.md`
2. **Expected:** Covers iOS deployment (certificates, internal, production), Android deployment (internal, closed testing, production), metadata-only updates, and troubleshooting.

### 9. Build passes with paywall-constants.ts change

1. Run `cd apps/mobile && pnpm run build`
2. **Expected:** Build succeeds with no errors.

## Edge Cases

### Character limit boundary values

1. Check that subtitle is exactly 29 chars (1 char headroom), not truncated
2. Check that keywords use no spaces after commas (maximizes keyword count within 100 chars)
3. **Expected:** Content is meaningful and not padded/truncated to hit limits

### Locale consistency

1. Compare de-DE and en-US file counts for both iOS and Android
2. **Expected:** Same number of files in each locale — no missing translations

## Failure Signals

- Any `wc -c` check exceeding the documented limit — store submission will fail
- Emoji grep returning results — AGENTS.md explicitly prohibits emojis in store metadata
- Missing metadata files in one locale but present in another — causes incomplete store listing
- `pnpm run build` failing — paywall-constants.ts change broke something
- `pokeresquedice` appearing in any fastlane config — incomplete adaptation from reference

## Requirements Proved By This UAT

- R024 (App Store / Play Store Optimization) — Store listings prepared with metadata, keywords, descriptions in de + en. Screenshot pipeline ready. No emojis. Character limits respected.

## Not Proven By This UAT

- Actual store submission success (S06 scope)
- Screenshot quality and framing (requires real device capture in S06)
- Legal page existence at fitlog.app URLs (external dependency)
- Fastlane lane execution (requires Apple/Google credentials configured)

## Notes for Tester

- All verification is file-based — no running app or server needed
- The legal URLs (fitlog.app/privacy, fitlog.app/terms) are placeholders that must resolve before production store submission
- German metadata uses ASCII ae/oe/ue instead of Umlaute — this is intentional for plain-text store metadata files
- Review notes in `review_information/notes.txt` are for Apple's review team — verify they accurately describe the subscription model

---
id: T03
parent: S05
milestone: M003
provides:
  - Frameit screenshot pipeline for iOS and Android with 6 FitLog-specific entries
  - Roboto font files in both screenshots/fonts/ and metadata/fonts/
  - de-DE keyword.strings and title.strings with German marketing text
  - Placeholder background.png for frameit
  - DEPLOYMENT_WORKFLOW.md with iOS + Android deployment guide
key_files:
  - apps/mobile/fastlane/screenshots/Framefile.json
  - apps/mobile/fastlane/metadata/android/Framefile.json
  - apps/mobile/fastlane/screenshots/de-DE/keyword.strings
  - apps/mobile/fastlane/screenshots/de-DE/title.strings
  - apps/mobile/fastlane/DEPLOYMENT_WORKFLOW.md
key_decisions:
  - Screenshot entries cover 6 key screens: workout tracking, exercise library, strength curves, PR tracking, program templates, premium analytics — aligned with store description feature highlights
  - German screenshot strings use ae/oe/ue (no Umlaute) per AGENTS.md ASCII convention for metadata files
  - DEPLOYMENT_WORKFLOW.md adapted from yahtzee with FitLog-specific prerequisites section (env vars, certificates, keystore) and metadata-only update instructions added
patterns_established:
  - Framefile.json data entries use filter "01"-"06" matching screenshot filenames captured in S06
  - Android Framefile references fonts via ../fonts/ relative path from metadata/android/ directory
observability_surfaces:
  - none
duration: 12min
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T03: Screenshot pipeline scaffolding and deployment docs

**Created frameit screenshot pipeline (iOS + Android Framefile.json with 6 entries each), supporting assets (fonts, background, de-DE strings), and DEPLOYMENT_WORKFLOW.md adapted from yahtzee reference.**

## What Happened

Built the complete frameit screenshot pipeline so S06 can capture real screenshots and have them automatically framed with device mockups and marketing text.

iOS Framefile.json targets 6 screens: workout tracking, exercise library, strength curves, personal records, program templates, and premium analytics. Each entry has English title/keyword text. The Android Framefile.json mirrors the same 6 entries with `use_platform: "ANDROID"` and adjusted font paths (`../fonts/`).

Copied Roboto-Bold.ttf and Roboto-Medium.ttf from yahtzee reference to both `screenshots/fonts/` and `metadata/fonts/`. Created a minimal 1x1 PNG as background.png placeholder to prevent frameit crashes when the Framefile references it.

Created de-DE keyword.strings and title.strings with German marketing text aligned to store descriptions. Created en-US/.gitkeep for future English screenshot locale.

DEPLOYMENT_WORKFLOW.md covers: prerequisites (env vars, certificates, keystore), iOS flow (sync_certificates → deploy_internal → promote_to_production), Android flow (deploy_internal → promote_to_closed_testing → promote_to_production), metadata-only updates, version management via git tags, and troubleshooting for common issues.

## Verification

All 13 task-level checks passed:
- iOS and Android Framefile.json exist and are valid JSON
- iOS Framefile has exactly 6 data entries
- Android Framefile has `use_platform: "ANDROID"`
- background.png exists (69 bytes, valid PNG)
- Roboto fonts in both screenshots/fonts/ and metadata/fonts/
- de-DE keyword.strings and title.strings exist
- en-US/.gitkeep exists
- DEPLOYMENT_WORKFLOW.md exists
- No emojis in any created files

All 15 slice-level checks pass: iOS 28 files (>=20), Android 12 files (>=8), all character limits met, healthOrWellnessTopics true, no emojis, all fastlane config files present, com.fitlog.app in Appfile, screenshots Framefile exists.

## Diagnostics

Static files — verify with `find apps/mobile/fastlane/screenshots -type f | sort` and `python3 -c "import json; print(json.dumps(json.load(open('apps/mobile/fastlane/screenshots/Framefile.json')), indent=2))"`.

## Deviations

Added background.png to `metadata/android/` as well since the Android Framefile.json references `./background.png` relative to its own directory. This wasn't explicitly in the plan but is required for frameit to work.

Added a "Metadata-Only Updates" section to DEPLOYMENT_WORKFLOW.md (not in yahtzee reference) since store listing updates without new builds are a common operation.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/fastlane/screenshots/Framefile.json` — iOS frameit config with 6 FitLog entries
- `apps/mobile/fastlane/screenshots/background.png` — 1x1 placeholder PNG
- `apps/mobile/fastlane/screenshots/fonts/Roboto-Bold.ttf` — Font for frameit title text
- `apps/mobile/fastlane/screenshots/fonts/Roboto-Medium.ttf` — Font for frameit keyword text
- `apps/mobile/fastlane/screenshots/de-DE/title.strings` — German screenshot titles
- `apps/mobile/fastlane/screenshots/de-DE/keyword.strings` — German screenshot keywords
- `apps/mobile/fastlane/screenshots/en-US/.gitkeep` — Placeholder for English locale
- `apps/mobile/fastlane/metadata/android/Framefile.json` — Android frameit config with 6 entries
- `apps/mobile/fastlane/metadata/android/background.png` — 1x1 placeholder PNG for Android
- `apps/mobile/fastlane/metadata/fonts/Roboto-Bold.ttf` — Android font for frameit title text
- `apps/mobile/fastlane/metadata/fonts/Roboto-Medium.ttf` — Android font for frameit keyword text
- `apps/mobile/fastlane/DEPLOYMENT_WORKFLOW.md` — iOS + Android deployment guide

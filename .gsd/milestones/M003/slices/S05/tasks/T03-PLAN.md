---
estimated_steps: 4
estimated_files: 8
---

# T03: Screenshot pipeline scaffolding and deployment docs

**Slice:** S05 — App Store & Play Store Listing Optimization
**Milestone:** M003

## Description

Create the frameit screenshot pipeline so S06 can capture real screenshots and have them automatically framed with device mockups and marketing text. Also write the deployment workflow documentation adapted from the yahtzee reference, giving the user a clear guide for iOS and Android deployment steps.

The screenshot pipeline includes: Framefile.json configuration for both iOS and Android with FitLog-specific screenshot titles and keywords (covering key app screens), Roboto font files for text overlay, per-locale keyword.strings and title.strings for German marketing text, and a 1x1 placeholder background.png. Actual screenshot PNGs are captured in S06 or manually — this task creates the pipeline that processes them.

## Steps

1. Create `apps/mobile/fastlane/screenshots/Framefile.json` with FitLog-specific screenshot data entries. Target 6 screenshots covering: workout logging, exercise library, analytics/strength curves, PR tracking, program templates, paywall/premium features. Include title and keyword text for each. Font paths reference `./fonts/Roboto-Bold.ttf` and `./fonts/Roboto-Medium.ttf`.
2. Copy font files from yahtzee reference: `references/yahtzee/apps/mobile/fastlane/screenshots/fonts/Roboto-Bold.ttf` and `Roboto-Medium.ttf` to `apps/mobile/fastlane/screenshots/fonts/`. Create a 1x1 placeholder `background.png` (minimal PNG to prevent frameit crash when Framefile references it). Create `apps/mobile/fastlane/screenshots/de-DE/keyword.strings` and `title.strings` with German marketing text for each screenshot. Create `apps/mobile/fastlane/screenshots/en-US/.gitkeep`.
3. Create `apps/mobile/fastlane/metadata/android/Framefile.json` for Android screenshot framing (same data entries, with `use_platform: "ANDROID"` and font paths adjusted to `../fonts/`). Create `apps/mobile/fastlane/metadata/fonts/Roboto-Bold.ttf` and `Roboto-Medium.ttf` (copy from yahtzee reference `metadata/fonts/`).
4. Write `apps/mobile/fastlane/DEPLOYMENT_WORKFLOW.md` — adapted from yahtzee reference, covering: prerequisites (env vars, certificates, keystore), iOS deployment flow (certificates → deploy_internal → promote_to_production), Android deployment flow (deploy_internal → promote lanes), metadata-only updates, troubleshooting pointers.

## Must-Haves

- [ ] iOS Framefile.json with 6 FitLog-specific screenshot entries
- [ ] Android Framefile.json with matching entries and `use_platform: "ANDROID"`
- [ ] Roboto font files in both `screenshots/fonts/` and `metadata/fonts/`
- [ ] de-DE keyword.strings and title.strings with German screenshot text
- [ ] en-US .gitkeep placeholder
- [ ] Placeholder background.png (prevents frameit crash)
- [ ] DEPLOYMENT_WORKFLOW.md with iOS + Android deployment instructions

## Verification

- `test -f apps/mobile/fastlane/screenshots/Framefile.json && echo "iOS Framefile exists"`
- `test -f apps/mobile/fastlane/metadata/android/Framefile.json && echo "Android Framefile exists"`
- `test -f apps/mobile/fastlane/screenshots/background.png && echo "Background exists"`
- `test -f apps/mobile/fastlane/screenshots/fonts/Roboto-Bold.ttf && test -f apps/mobile/fastlane/screenshots/fonts/Roboto-Medium.ttf && echo "Fonts exist"`
- `test -f apps/mobile/fastlane/screenshots/de-DE/keyword.strings && test -f apps/mobile/fastlane/screenshots/de-DE/title.strings && echo "de-DE strings exist"`
- `test -f apps/mobile/fastlane/DEPLOYMENT_WORKFLOW.md && echo "Deployment docs exist"`
- `python3 -c "import json; json.load(open('apps/mobile/fastlane/screenshots/Framefile.json'))" && echo "Valid JSON"`

## Inputs

- `references/yahtzee/apps/mobile/fastlane/screenshots/Framefile.json` — Reference iOS frameit config
- `references/yahtzee/apps/mobile/fastlane/metadata/android/Framefile.json` — Reference Android frameit config
- `references/yahtzee/apps/mobile/fastlane/screenshots/fonts/` — Roboto font files
- `references/yahtzee/apps/mobile/fastlane/metadata/fonts/` — Android Roboto font files
- `references/yahtzee/apps/mobile/fastlane/screenshots/de-DE/` — Reference German screenshot strings
- `references/yahtzee/apps/mobile/fastlane/DEPLOYMENT_WORKFLOW.md` — Reference deployment docs
- T02 outputs — Store listing content established (screenshot titles should align with store descriptions)

## Expected Output

- `apps/mobile/fastlane/screenshots/Framefile.json` — iOS frameit config with 6 FitLog entries
- `apps/mobile/fastlane/screenshots/background.png` — 1x1 placeholder
- `apps/mobile/fastlane/screenshots/fonts/` — Roboto Bold + Medium
- `apps/mobile/fastlane/screenshots/de-DE/keyword.strings` + `title.strings`
- `apps/mobile/fastlane/screenshots/en-US/.gitkeep`
- `apps/mobile/fastlane/metadata/android/Framefile.json` — Android frameit config
- `apps/mobile/fastlane/metadata/fonts/` — Roboto Bold + Medium
- `apps/mobile/fastlane/DEPLOYMENT_WORKFLOW.md` — Deployment guide

---
estimated_steps: 5
estimated_files: 3
---

# T01: Pre-submission validation script and en-US frameit strings

**Slice:** S06 — End-to-End Integration & Store Submission
**Milestone:** M003

## Description

Create the missing en-US frameit locale strings so English screenshots can be framed, then build a comprehensive pre-submission validation script that checks every automatable prerequisite for store submission. The script is the primary agent deliverable for this slice — it catches preventable errors before the human touches the stores.

## Steps

1. Create `apps/mobile/fastlane/screenshots/en-US/keyword.strings` with English text for all 6 Framefile filter entries ("01"-"06"), matching the marketing language in the iOS Framefile.json defaults.
2. Create `apps/mobile/fastlane/screenshots/en-US/title.strings` with English titles for the same 6 entries.
3. Build `apps/mobile/scripts/verify-s06-submission.sh` with 20+ checks organized in sections:
   - **Metadata completeness:** iOS file count >= 20, Android file count >= 8, review_information files present
   - **Character limits:** iOS subtitle de-DE and en-US <= 30 chars, iOS keywords <= 100 chars each, Android title <= 30 chars each, Android short_description <= 80 chars each
   - **Content rules:** No emojis in any metadata file, age_rating_declaration.json contains healthOrWellnessTopics: true
   - **Product consistency:** All 3 PRODUCT_IDS from purchase-plugin.ts appear in Products.storekit
   - **Entitlements:** App.entitlements contains com.apple.developer.in-app-purchases
   - **Fastlane config:** Fastfile, Appfile, Matchfile, Pluginfile, .env.example all present; Appfile references com.fitlog.app
   - **Screenshot pipeline:** Framefile.json exists for iOS and Android; de-DE and en-US each have keyword.strings and title.strings with 6 entries
   - **Build verification:** `pnpm test` passes, `pnpm run build` succeeds
4. Make script output clear per-check PASS/FAIL with a final summary count and exit code (0 = all pass, 1 = any fail).
5. Run the script and fix any issues it reveals (expect none, but validate).

## Must-Haves

- [ ] en-US keyword.strings has 6 entries matching filters "01"-"06"
- [ ] en-US title.strings has 6 entries matching filters "01"-"06"
- [ ] Validation script checks 20+ distinct conditions
- [ ] Script exits 0 when all checks pass, exits 1 with clear output on failure
- [ ] Product IDs in code match Products.storekit config
- [ ] `pnpm test` and `pnpm run build` still pass

## Verification

- `bash apps/mobile/scripts/verify-s06-submission.sh` exits 0
- `grep -c '"0' apps/mobile/fastlane/screenshots/en-US/keyword.strings` returns 6
- `grep -c '"0' apps/mobile/fastlane/screenshots/en-US/title.strings` returns 6

## Inputs

- `apps/mobile/fastlane/screenshots/Framefile.json` — defines the 6 filter entries and default English text
- `apps/mobile/fastlane/screenshots/de-DE/keyword.strings` — reference format for .strings files
- `apps/mobile/fastlane/metadata/` — all metadata files to validate
- `apps/mobile/ios/App/App/Products.storekit` — StoreKit product definitions
- `apps/mobile/ios/App/App/App.entitlements` — IAP entitlement
- `apps/mobile/src/lib/services/purchase-plugin.ts` — PRODUCT_IDS constants

## Expected Output

- `apps/mobile/fastlane/screenshots/en-US/keyword.strings` — English keyword strings for 6 screenshots
- `apps/mobile/fastlane/screenshots/en-US/title.strings` — English title strings for 6 screenshots
- `apps/mobile/scripts/verify-s06-submission.sh` — Comprehensive validation script with 20+ checks, all passing

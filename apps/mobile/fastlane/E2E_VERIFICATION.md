# E2E Verification Runbook & Store Submission Checklist

End-to-end testing and store submission guide for FitLog. This document covers every human-gated step from environment setup through store submission and post-submission monitoring.

For detailed fastlane lane documentation and promotion pipeline mechanics, see [DEPLOYMENT_WORKFLOW.md](./DEPLOYMENT_WORKFLOW.md).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [iOS Sandbox Testing](#ios-sandbox-testing)
3. [Android Test Track Testing](#android-test-track-testing)
4. [Screenshot Capture](#screenshot-capture)
5. [Store Submission](#store-submission)
6. [Post-Submission](#post-submission)

---

## Prerequisites

### Automated Pre-Submission Checks

Before any manual testing, run the automated validation script:

```bash
bash apps/mobile/scripts/verify-s06-submission.sh
```

All 30 checks must pass. Fix any failures before proceeding — each failed check prints the expected vs actual value.

### Environment Variables

Copy `.env.example` to `.env` and fill in all values:

```bash
cp apps/mobile/fastlane/.env.example apps/mobile/fastlane/.env
```

Required variables by platform:

| Variable | Platform | Where to find |
|---|---|---|
| `APPLE_ID` | iOS | Your Apple Developer account email |
| `FASTLANE_TEAM_ID` | iOS | [Developer Portal](https://developer.apple.com/account/#/membership) > Team ID |
| `FASTLANE_ITC_TEAM_ID` | iOS | App Store Connect > Users and Access |
| `FASTLANE_KEY_ID` | iOS | App Store Connect > Keys |
| `FASTLANE_ISSUER_ID` | iOS | App Store Connect > Keys (Issuer ID at top) |
| `FASTLANE_KEY_FILEPATH` | iOS | Path to downloaded `.p8` API key file |
| `MATCH_GIT_URL` | iOS | Private git repo for encrypted certificates |
| `MATCH_PASSWORD` | iOS | Encryption password for match certificates |
| `GOOGLE_PLAY_JSON_KEY_PATH` | Android | Google Cloud Console > Service Accounts > JSON key |
| `MYAPP_UPLOAD_STORE_FILE` | Android | Path to release keystore (relative to `android/app/`) |
| `MYAPP_UPLOAD_KEY_ALIAS` | Android | Alias used during keystore generation |
| `MYAPP_UPLOAD_STORE_PASSWORD` | Android | Keystore password |
| `MYAPP_UPLOAD_KEY_PASSWORD` | Android | Key password |

### App Store Connect — Product Configuration

Three in-app purchase products must be configured and in **"Ready to Submit"** status:

| Product ID | Type | Description |
|---|---|---|
| `com.fitlog.app.premium.annual` | Auto-Renewable Subscription | Premium annual plan |
| `com.fitlog.app.premium.monthly` | Auto-Renewable Subscription | Premium monthly plan |
| `com.fitlog.app.templates.pack` | Non-Consumable | Template pack one-time purchase |

Verify in App Store Connect > My Apps > FitLog > Subscriptions / In-App Purchases that:
- Each product ID matches exactly (case-sensitive)
- Status is "Ready to Submit" (not "Missing Metadata" or "Developer Action Needed")
- Subscription group is configured for the two subscription products
- Pricing is set for all target territories

### Google Play Console — Product Configuration

Same three products must be configured in Google Play Console > Monetize:

| Product ID | Type | Base Plan IDs |
|---|---|---|
| `com.fitlog.app.premium.annual` | Subscription | `annual-plan` |
| `com.fitlog.app.premium.monthly` | Subscription | `monthly-plan` |
| `com.fitlog.app.templates.pack` | One-time product | N/A |

Ensure:
- A **closed testing track** exists with at least one tester email added
- License testing accounts are configured under Settings > License testing
- Subscriptions have base plans with pricing in "Active" status

### StoreKit Configuration (Xcode)

The local StoreKit configuration file at `ios/App/App/Products.storekit` must be selected in the Xcode scheme:

1. Open `ios/App/App.xcworkspace` in Xcode
2. Edit Scheme > Run > Options > StoreKit Configuration
3. Select `Products.storekit`

This enables sandbox purchase testing on both simulator and device without connecting to App Store servers.

### Android Keystore

If no release keystore exists yet, generate one:

```bash
cd apps/mobile/android/app
keytool -genkeypair -v -storetype PKCS12 \
  -keystore my-release-key.keystore -alias my-key-alias \
  -keyalg RSA -keysize 2048 -validity 10000
```

**CRITICAL: Back up the keystore to 2+ secure locations.** Losing the keystore means you can never update the app on Google Play. See `fastlane/docs/KEYSTORE_BACKUP_STRATEGY.md`.

### Legal Pages (PRODUCTION BLOCKER)

> **Both legal URLs must be live and publicly accessible before submitting to production review.**

| URL | Purpose |
|---|---|
| `https://fitlog.app/privacy` | Privacy Policy |
| `https://fitlog.app/terms` | Terms of Service |

Apple **will reject** subscription apps if these URLs return errors, redirect loops, or placeholder content. Verify both URLs load correctly in a browser and on a mobile device before submitting.

These URLs are hardcoded in `src/lib/components/premium/paywall-constants.ts` and displayed on the paywall screen.

---

## iOS Sandbox Testing

Test the full purchase lifecycle on a real device or simulator with the StoreKit configuration enabled.

### Setup

1. Ensure the StoreKit configuration is selected in the Xcode scheme (see Prerequisites)
2. Build and run on device/simulator: `npx cap run ios`
3. If testing on a real device, sign in with a sandbox Apple ID (Settings > App Store > Sandbox Account)

### Purchase Flow

1. **Open the paywall** — Navigate to Settings > Premium (or trigger the paywall from a premium-gated feature)
2. **Select annual subscription** (`com.fitlog.app.premium.annual`)
3. **Complete purchase** — Confirm in the StoreKit payment sheet
4. **Verify premium unlock:**
   - Analytics section should now be accessible (no paywall gate)
   - Premium badge/indicator should appear in settings
5. **Purchase template pack** (`com.fitlog.app.templates.pack`)
6. **Verify template unlock:**
   - All 8 program templates should be accessible
   - Template pack should show as "Purchased" on the paywall

### Restart Persistence

1. **Kill the app completely** (swipe up from app switcher)
2. **Relaunch the app**
3. **Verify purchases persist:**
   - Premium features still unlocked (no re-purchase prompt)
   - Template pack still accessible
   - The app calls `revalidatePurchases` on launch — check console logs for `[PurchasePlugin]` confirmation

### Restore Purchases

1. **Test from Settings:** Navigate to Settings > Restore Purchases
2. **Verify:** All previously purchased items are restored and features remain unlocked
3. **Test on a fresh install (optional):** Delete and reinstall the app, sign in with the same sandbox account, tap Restore Purchases

### Subscription Management

1. **Verify subscription management link** in Settings opens the system subscription management UI
2. **Confirm** the active subscription appears with correct renewal date

### Subscription Expiry

With the StoreKit configuration in Xcode:

1. **Open the StoreKit Transaction Manager** (Xcode > Debug > StoreKit > Manage Transactions)
2. **Expire the active subscription** manually
3. **Return to the app** and trigger a purchase state refresh (background the app and return, or navigate to settings)
4. **Verify premium is revoked:**
   - Analytics section is gated again
   - Paywall reappears for premium features
   - Non-subscription purchases (template pack) remain unlocked

### iOS Testing Checklist

- [ ] Paywall displays with correct pricing for annual and monthly plans
- [ ] Annual subscription purchase completes successfully
- [ ] Premium features unlock after purchase
- [ ] Template pack purchase completes successfully
- [ ] Templates unlock after purchase
- [ ] Purchases persist after app restart
- [ ] Restore Purchases works from settings
- [ ] Subscription management link opens correctly
- [ ] Subscription expiry revokes premium access
- [ ] Template pack remains after subscription expiry
- [ ] Privacy Policy and Terms of Service links on paywall open correctly

---

## Android Test Track Testing

Test the full purchase lifecycle on a real Android device using the closed testing track.

### Setup

1. **Upload an initial build** to internal testing (see [Store Submission](#store-submission))
2. **Add tester emails** to the closed testing track in Google Play Console
3. **Opt in as a tester** using the opt-in URL from Play Console
4. **Install the app** from the Play Store (internal track version)
5. Ensure the tester account is also listed under Settings > License testing for test purchases

### Purchase Flow

1. **Open the paywall** — Navigate to Settings > Premium
2. **Select annual subscription** (`com.fitlog.app.premium.annual`, base plan: `annual-plan`)
3. **Complete purchase** through the Google Play billing sheet
4. **Verify purchase acknowledgement:**
   - Check console logs for `[PurchasePlugin]` acknowledgement confirmation
   - Unacknowledged purchases are automatically refunded after 3 days
5. **Verify premium unlock:**
   - Analytics section accessible
   - Premium indicator visible
6. **Purchase template pack** (`com.fitlog.app.templates.pack`)
7. **Verify template unlock**

### Restart Persistence

1. **Force stop the app** (Settings > Apps > FitLog > Force Stop)
2. **Relaunch the app**
3. **Verify all purchases persist** — premium features and templates remain unlocked

### Restore Purchases

1. **Test from Settings:** Navigate to Settings > Restore Purchases
2. **Verify:** All purchased items are restored
3. **Test on another device (optional):** Sign in with the same Google account and verify purchases restore

### Android Testing Checklist

- [ ] App installs from internal/closed testing track
- [ ] Paywall displays with correct pricing
- [ ] Annual subscription purchase completes
- [ ] Purchase is acknowledged (check logs)
- [ ] Premium features unlock after purchase
- [ ] Template pack purchase completes
- [ ] Templates unlock after purchase
- [ ] Purchases persist after force stop and relaunch
- [ ] Restore Purchases works from settings
- [ ] Privacy Policy and Terms of Service links on paywall open correctly

---

## Screenshot Capture

### Required Screens

Six screenshots are required, matching the Framefile.json filter definitions:

| Filter | Screen | Content |
|---|---|---|
| `01` | Active Workout | Sets, weight, reps, and RIR tracking during a workout |
| `02` | Exercise Library | Browsing the 100+ built-in exercises |
| `03` | Strength Curves | Chart showing progression over time |
| `04` | PR Tracking | Personal records display |
| `05` | Program Templates | Available training program templates |
| `06` | Premium Analytics | Volume trends and insights dashboard |

### Naming Convention

Screenshot filenames **must** contain the filter string so `fastlane frameit` can match them:

```
{locale}_{device}_{filter}_{description}.png
```

Examples:
```
de-DE_iPhone_6.7_01_active_workout.png
en-US_iPhone_6.7_02_exercise_library.png
de-DE_iPhone_5.5_03_strength_curves.png
```

The filter number (`01`, `02`, etc.) must appear somewhere in the filename — frameit uses this to apply the correct title and keyword overlay.

### Required Resolutions

#### iOS (App Store Connect)

| Display Size | Device | Resolution (portrait) |
|---|---|---|
| 6.7" | iPhone 15 Pro Max / 16 Pro Max | 1290 x 2796 |
| 6.5" | iPhone 14 Plus / 15 Plus | 1284 x 2778 |
| 5.5" | iPhone 8 Plus (still required) | 1242 x 2208 |
| 12.9" iPad | iPad Pro 12.9" (6th gen) | 2048 x 2732 |

Minimum: 6.7" and 5.5" iPhone sizes are required. iPad is required if the app declares iPad support.

#### Android (Google Play)

| Type | Resolution | Notes |
|---|---|---|
| Phone | 1080 x 1920 minimum | 16:9 or taller aspect ratio |
| 7" Tablet | 1200 x 1920 recommended | If tablet layout is supported |
| 10" Tablet | 1920 x 1200 recommended | If tablet layout is supported |

Google Play requires at least 2 screenshots per device type, up to 8 per type.

### Locale Directories

Place raw screenshots (without frames) in the locale-specific directories:

```
apps/mobile/fastlane/screenshots/
  de-DE/          # German screenshots + keyword.strings + title.strings
  en-US/          # English screenshots + keyword.strings + title.strings
  Framefile.json  # Frame configuration
  background.png  # Frame background
  fonts/          # Fonts for overlay text
```

### Running Frameit

After placing all raw screenshots:

```bash
cd apps/mobile/fastlane/screenshots
fastlane frameit
```

This applies device frames, title text, and keyword text to each screenshot based on the Framefile.json configuration and the locale-specific `.strings` files.

### Verification

After frameit completes:

1. Check that framed screenshots exist for both `de-DE` and `en-US`
2. Verify title text matches the locale (German titles for de-DE, English for en-US)
3. Verify all 6 filter screens have framed output per device size
4. Visually inspect: text readable, no clipping, frames look professional

---

## Store Submission

All fastlane commands must be run from the `apps/mobile` directory. See [DEPLOYMENT_WORKFLOW.md](./DEPLOYMENT_WORKFLOW.md) for full lane documentation.

### Pre-Submission

```bash
# Run all automated checks first
bash apps/mobile/scripts/verify-s06-submission.sh

# Sync iOS certificates
cd apps/mobile
bundle exec fastlane ios sync_certificates
```

### iOS — TestFlight Internal Testing

```bash
# Create a version tag
git tag v1.0
git push origin v1.0

# Build and upload to TestFlight
bundle exec fastlane ios deploy_internal
```

Build will be available to internal testers after App Store Connect processing (10-30 minutes).

### iOS — Metadata Upload

```bash
bundle exec fastlane ios upload_metadata
```

Uploads all metadata from `metadata/ios/` including descriptions, keywords, and screenshots.

### iOS — Production Submission

After internal testing passes:

```bash
bundle exec fastlane ios promote_to_production
```

This creates a new App Store version, links the latest TestFlight build, and submits for review with automatic release enabled.

### Android — Internal Testing

```bash
# Build and upload to internal testing track
bundle exec fastlane android deploy_internal
```

Build is available immediately to internal testers (no review required).

### Android — Metadata Upload

```bash
bundle exec fastlane android upload_metadata
```

Uploads all metadata from `metadata/android/` to Google Play Console.

### Android — Promotion Pipeline

```bash
# After internal testing passes
bundle exec fastlane android promote_to_closed_testing

# After closed testing passes
bundle exec fastlane android promote_to_production
```

### Submission Order

Recommended sequence:

1. Upload metadata for both platforms
2. Deploy iOS to TestFlight internal
3. Deploy Android to internal testing
4. Complete device testing on both platforms (see sections above)
5. Promote iOS to production (submits for Apple review)
6. Promote Android through closed testing to production

---

## Post-Submission

### Common Apple Rejection Reasons for Subscription Apps

| Reason | Prevention |
|---|---|
| **Legal URLs not loading** | Verify `https://fitlog.app/privacy` and `https://fitlog.app/terms` load on mobile before submitting |
| **Missing subscription terms** | Ensure paywall shows subscription duration, price, and renewal terms clearly |
| **Screenshots don't match app** | Take fresh screenshots from the submitted build, not mockups |
| **Broken payment flow** | Test the full purchase lifecycle in sandbox before submitting |
| **Missing restore purchases** | Verify the Restore Purchases button exists and works |
| **Insufficient app description** | Description must mention subscription features and pricing |
| **Privacy policy incomplete** | Policy must cover data collection, usage, and third-party sharing |

### Monitoring After Submission

#### App Store Connect

- **Processing status:** My Apps > Activity tab — build should move from "Processing" to "Ready for Review"
- **Review status:** My Apps > App Store tab — watch for "In Review", "Waiting for Review", or "Rejected"
- **Crash reports:** My Apps > Analytics > Crashes — monitor for launch crashes in TestFlight builds
- **Subscription metrics:** App Analytics > Subscriptions — verify test purchases appear

#### Google Play Console

- **Release status:** Release > Production/Testing > view release status
- **Pre-launch report:** Release > Pre-launch report — automated device testing results
- **Crash reports:** Quality > Android Vitals > Crashes and ANRs
- **Subscription dashboard:** Monetize > Subscriptions — verify test transactions

### Handling Rejections

1. **Read the rejection reason carefully** in App Store Connect's Resolution Center
2. **Do not reply immediately** — fix the issue first
3. **If unclear,** reply asking for specific details about what needs to change
4. **Fix and resubmit:**
   - For metadata issues: `bundle exec fastlane ios upload_metadata` then resubmit
   - For binary issues: fix code, bump build number, `bundle exec fastlane ios deploy_internal`, then promote again
5. **Common quick fixes:**
   - Legal URL issues: ensure URLs are HTTPS, load fast, no redirects to login walls
   - Screenshot mismatch: retake screenshots from the actual submitted build
   - Subscription disclosure: add clear pricing and renewal terms to the paywall UI

### Final Production Checks

After approval and release:

- [ ] Download from App Store / Play Store on a clean device
- [ ] Complete one full purchase flow (use a real account for final verification)
- [ ] Verify legal links work in the production build
- [ ] Monitor crash reports for the first 24-48 hours
- [ ] Check subscription metrics appear in store dashboards

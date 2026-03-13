# Deployment Workflow

This document describes the promotion-based deployment workflow for FitLog iOS and Android apps.

## Philosophy

**One Build, Multiple Stages**: Each version is built once and promoted through testing stages. This ensures the exact same binary that testers validated goes to production, eliminating "works in testing but breaks in production" issues.

## Prerequisites

### Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

- `APP_STORE_CONNECT_API_KEY_ID` — App Store Connect API Key ID
- `APP_STORE_CONNECT_API_ISSUER_ID` — App Store Connect API Issuer ID
- `APP_STORE_CONNECT_API_KEY_CONTENT` — App Store Connect API Key (base64-encoded p8)
- `MATCH_GIT_URL` — Git repository URL for certificate storage (match)
- `MATCH_PASSWORD` — Password to decrypt match certificates
- `GOOGLE_PLAY_JSON_KEY_FILE` — Path to Google Play service account JSON key
- `ANDROID_KEYSTORE_FILE` — Path to Android release keystore
- `ANDROID_KEYSTORE_PASSWORD` — Keystore password
- `ANDROID_KEY_ALIAS` — Key alias in the keystore
- `ANDROID_KEY_PASSWORD` — Key password

### Certificates (iOS)

Sync certificates and provisioning profiles before building:

```bash
bundle exec fastlane ios sync_certificates
```

This uses [match](https://docs.fastlane.tools/actions/match/) to download certificates from the configured git repository.

### Keystore (Android)

Ensure the Android release keystore is available at the path specified by `ANDROID_KEYSTORE_FILE`. The keystore must contain the key alias specified by `ANDROID_KEY_ALIAS`.

---

## Workflow Overview

### Android

Three-stage promotion pipeline:

```
Build → Internal Testing → Closed Testing → Production
```

### iOS

Two-stage promotion pipeline:

```
Build → Internal Testing → Production
```

### Key Principles

1. **Build Once**: Only the `deploy_internal` lane creates new builds
2. **Promote Up**: Use promotion lanes to move builds through testing stages
3. **Same Binary**: Production releases use the exact binary from testing
4. **No Direct Upload**: Never upload directly to production

---

## Android Deployment

### Step 1: Deploy to Internal Testing

Build and upload a new version to internal testing:

```bash
bundle exec fastlane android deploy_internal
```

**What it does:**

- Reads version from git tag (if available)
- Increments version code automatically
- Builds signed AAB
- Uploads to Play Console Internal Testing track

**Output:**

- Build available immediately to internal testers
- No review required

### Step 2: Promote to Closed Testing

After internal testing passes, promote to closed testing:

```bash
bundle exec fastlane android promote_to_closed_testing
```

**What it does:**

- Fetches latest version from internal testing
- Promotes that version to closed testing track
- No new build created

**Output:**

- Same build now available in closed testing
- Available to closed tester group

### Step 3: Promote to Production

After closed testing passes, promote to production:

```bash
bundle exec fastlane android promote_to_production
```

**What it does:**

- Fetches latest version from closed testing
- Promotes that version to production track
- 100% rollout (immediate release)

**Output:**

- Same build now live in production
- Available to all users

---

## iOS Deployment

### Step 1: Deploy to Internal Testing

Build and upload a new version to TestFlight internal testing:

```bash
bundle exec fastlane ios deploy_internal
```

**What it does:**

- Increments build number automatically
- Builds signed IPA
- Uploads to App Store Connect / TestFlight
- Available to internal testers only

**Output:**

- Build available after processing (10-30 minutes)
- No review required for internal testing

### Step 2: Promote to Production

After internal testing passes, promote to App Store production:

```bash
bundle exec fastlane ios promote_to_production
```

**What it does:**

- Reads version from git tag
- Fetches latest TestFlight build number automatically
- Creates new App Store version
- Links to latest TestFlight build (no new upload)
- Submits for App Store review
- Sets automatic release after approval

**Output:**

- App submitted for App Store review
- Uses latest TestFlight build
- Automatic release enabled

---

## Complete Example Workflow

### Android Example

```bash
# 1. Create version tag
git tag v1.0
git push origin v1.0

# 2. Build and upload to internal testing
bundle exec fastlane android deploy_internal

# 3. Test internally, then promote
bundle exec fastlane android promote_to_closed_testing

# 4. Test with closed testers, then promote
bundle exec fastlane android promote_to_production
```

### iOS Example

```bash
# 1. Create version tag (optional, but recommended)
git tag v1.0
git push origin v1.0

# 2. Build and upload to TestFlight internal
bundle exec fastlane ios deploy_internal

# 3. Test internally, then promote to production
bundle exec fastlane ios promote_to_production
```

---

## Metadata-Only Updates

To update store listing metadata (descriptions, screenshots, what's new) without submitting a new build:

### iOS

```bash
bundle exec fastlane ios upload_metadata
```

This uploads all metadata from `metadata/ios/` to App Store Connect.

### Android

```bash
bundle exec fastlane android upload_metadata
```

This uploads all metadata from `metadata/android/` to Google Play Console.

---

## Version Management

### Git Tags

Both platforms use git tags for version names:

```bash
# Create tag
git tag v1.0

# Push tag to remote
git push origin v1.0
```

- Android: Reads version name from tag automatically
- iOS: Reads version from tag for production releases
- Format: `v{major}.{minor}` (e.g., v1.0, v2.3)

### Build/Version Codes

- **Android**: Version code auto-incremented from Play Console
- **iOS**: Build number auto-incremented from TestFlight
- Both are managed automatically by the lanes

---

## Troubleshooting

### "Version code already used" (Android)

The version code should auto-increment. If you see this error:

1. Check service account permissions
2. Ensure track exists in Play Console
3. Manually verify version code in Play Console

### "Build not found" (iOS)

When promoting to production:

1. Verify build number exists in TestFlight
2. Ensure build passed Apple's automated review
3. Check that build isn't expired (90 days)

### "Cannot promote" (Android)

Ensure the build exists in the source track:

1. Check Play Console for build in source track
2. Wait for build processing to complete
3. Verify service account has necessary permissions

### Certificate / Provisioning Issues (iOS)

If builds fail with signing errors:

1. Run `bundle exec fastlane ios sync_certificates` to refresh
2. Check that `MATCH_GIT_URL` and `MATCH_PASSWORD` are set correctly
3. Verify Apple Developer account membership is active

### Keystore Issues (Android)

If builds fail with signing errors:

1. Verify keystore file exists at `ANDROID_KEYSTORE_FILE` path
2. Check that `ANDROID_KEY_ALIAS` matches a key in the keystore
3. Verify passwords are correct

---

## Additional Resources

- [Fastlane Documentation](https://docs.fastlane.tools)
- [Play Console Help](https://support.google.com/googleplay/android-developer)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [TestFlight Documentation](https://developer.apple.com/testflight/)

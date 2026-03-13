---
estimated_steps: 5
estimated_files: 4
---

# T07: Scaffold native iOS and Android projects

**Slice:** S06 — Design Polish & Platform Builds
**Milestone:** M001

## Description

Scaffold the native iOS and Android projects using Capacitor CLI. This is the final task in S06 because it depends on a successful `pnpm build` with all UI finalized. Updates the placeholder `capacitor.config.ts` with real app identity, builds the web assets, then runs `npx cap add` for both platforms and `npx cap sync` to install plugins. This fulfills R011 (iOS + Android Builds).

## Steps

1. Update `capacitor.config.ts` — Change `appId` from `'com.example.myapp'` to `'com.fitlog.app'`. Change `appName` from `'My App'` to `'FitLog'`. Keep existing plugin config (SplashScreen, CapacitorUpdater). The `webDir: 'build'` is correct for `@sveltejs/adapter-static`.
2. Run `pnpm --filter @repo/mobile build` — This generates the `build/` directory with the static SvelteKit output. Must exit 0. If build fails, fix issues before proceeding.
3. Scaffold native projects — Run `cd apps/mobile && npx cap add ios && npx cap add android` to create the `ios/` and `android/` directories with native project files. These commands read `capacitor.config.ts` for appId and appName.
4. Sync web assets and plugins — Run `cd apps/mobile && npx cap sync` to copy the `build/` contents into both native projects and install/configure all Capacitor plugins (haptics, preferences, splash-screen, fast-sql, safe-area, etc.).
5. Verify native project structure — Check that `apps/mobile/ios/App/App.xcodeproj` and `apps/mobile/android/app/build.gradle.kts` (or `build.gradle`) exist. Check that `capacitor.config.ts` has the correct appId. Ensure `ios/` and `android/` are in `.gitignore` if they should be (decision: typically native projects ARE committed for Capacitor apps, but check existing .gitignore patterns).

## Must-Haves

- [ ] `capacitor.config.ts` has `appId: 'com.fitlog.app'` and `appName: 'FitLog'`
- [ ] `pnpm --filter @repo/mobile build` exits 0
- [ ] `apps/mobile/ios/` directory exists with Xcode project structure
- [ ] `apps/mobile/android/` directory exists with Gradle project structure
- [ ] `npx cap sync` completes successfully

## Verification

- `grep 'com.fitlog.app' apps/mobile/capacitor.config.ts` confirms appId
- `grep "'FitLog'" apps/mobile/capacitor.config.ts` confirms appName
- `test -d apps/mobile/ios/App` exits 0
- `test -d apps/mobile/android/app` exits 0
- `test -f apps/mobile/build/index.html` exits 0 (build output exists)

## Observability Impact

- Signals added/changed: Build output in stdout; `cap sync` output shows plugin installation status
- How a future agent inspects this: Check for `ios/` and `android/` directories; run `npx cap sync --deployment` for dry-run; check `capacitor.config.ts` for correct identity
- Failure state exposed: Build errors in stdout; `cap add` errors if build/ is missing; `cap sync` errors if plugins are misconfigured

## Inputs

- `apps/mobile/capacitor.config.ts` — Current placeholder config
- All S06 T01–T06 outputs — Finalized UI that builds correctly
- `apps/mobile/package.json` — All Capacitor dependencies already listed

## Expected Output

- `apps/mobile/capacitor.config.ts` — Updated with real appId and appName
- `apps/mobile/ios/` — Generated iOS native project (Xcode)
- `apps/mobile/android/` — Generated Android native project (Gradle)
- `apps/mobile/build/` — Static web build output

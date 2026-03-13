---
id: T07
parent: S06
milestone: M001
provides:
  - Native iOS project scaffolded at apps/mobile/ios/ with Xcode project structure
  - Native Android project scaffolded at apps/mobile/android/ with Gradle project structure
  - capacitor.config.ts updated with real appId (com.fitlog.app) and appName (FitLog)
  - Successful production build at apps/mobile/build/
  - All 8 Capacitor plugins synced to both platforms
key_files:
  - apps/mobile/capacitor.config.ts
  - apps/mobile/ios/
  - apps/mobile/android/
  - apps/mobile/build/
key_decisions:
  - "Native projects committed to git (not gitignored) — contains plugin registrations and platform config not reproducible from cap add alone (D039)"
patterns_established:
  - "Capacitor build/sync workflow: pnpm build → npx cap sync (copies build/ to native projects and installs plugins)"
observability_surfaces:
  - "npx cap sync output shows plugin count and copy status for both platforms"
  - "pnpm build exit code and build/ directory presence confirm web asset generation"
duration: 15m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T07: Scaffolded native iOS and Android projects with real app identity

**Updated capacitor.config.ts with com.fitlog.app/FitLog identity, built production web assets, and scaffolded both native platforms with 8 Capacitor plugins synced.**

## What Happened

Updated `capacitor.config.ts` to replace placeholder values (`com.example.myapp`/`My App`) with the real app identity (`com.fitlog.app`/`FitLog`). Ran `pnpm --filter mobile build` which produced the static SvelteKit output in `build/` (exit 0, 786KB client bundle). Then ran `npx cap add ios` and `npx cap add android` which created both native project directories. Finally ran `npx cap sync` which copied web assets into both platforms and installed all 8 Capacitor plugins: safe-area, app, browser, haptics, preferences, splash-screen, fast-sql, and capacitor-updater.

## Verification

All 5 task must-haves verified:
- `grep 'com.fitlog.app' apps/mobile/capacitor.config.ts` — confirmed appId
- `grep "'FitLog'" apps/mobile/capacitor.config.ts` — confirmed appName
- `test -d apps/mobile/ios/App` — iOS project exists (App, App.xcodeproj, CapApp-SPM)
- `test -d apps/mobile/android/app` — Android project exists (build.gradle, src/)
- `test -f apps/mobile/build/index.html` — build output exists

All 10 slice-level verification checks passed (final task):
1. Build + build dir — PASS
2. iOS project exists — PASS
3. Android project exists — PASS
4. Haptics service file — PASS
5. Haptic calls in workout components — PASS
6. Settings mode toggle — PASS
7. dnd-kit in ExerciseAssignmentList — PASS
8. BottomNav in layout — PASS
9. Safe-area padding — PASS
10. de.json key count > 230 (actual: 236) — PASS

## Diagnostics

- Check native project health: `cd apps/mobile && npx cap sync` (re-syncs web assets + plugins, shows plugin list)
- Dry-run sync: `cd apps/mobile && npx cap sync --deployment`
- Verify app identity: `grep 'appId\|appName' apps/mobile/capacitor.config.ts`
- iOS project: `ls apps/mobile/ios/App/App.xcodeproj`
- Android project: `ls apps/mobile/android/app/build.gradle`

## Deviations

- Task plan note about `.gitignore` said "typically native projects ARE committed for Capacitor apps" — confirmed neither ios/ nor android/ are in .gitignore, matching this expectation. No change needed.
- Build filter used `--filter mobile` instead of `--filter @repo/mobile` since the package.json name is `mobile`, not `@repo/mobile`.

## Known Issues

- Build produces a 786KB client bundle with chunk size warning — code splitting could be addressed in a future optimization pass.
- Svelte warnings about `state_referenced_locally` in toggle-group component (from shadcn-svelte upstream) — cosmetic, not affecting runtime.

## Files Created/Modified

- `apps/mobile/capacitor.config.ts` — Updated appId to `com.fitlog.app` and appName to `FitLog`
- `apps/mobile/ios/` — Generated iOS native project (Xcode project, Swift Package Manager config)
- `apps/mobile/android/` — Generated Android native project (Gradle build, source directories)
- `apps/mobile/build/` — Static SvelteKit production build output

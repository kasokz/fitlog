# S01: No-Reload Language Switching — UAT

**Milestone:** M006
**Written:** 2026-03-14

## UAT Type

- UAT mode: human-experience
- Why this mode is sufficient: Language switching is a visual, interactive feature — the user must see text update in-place without page reload. Build verification confirms compilation, but the actual UX requires a running app on device or browser.

## Preconditions

- App is running locally (`pnpm dev`) or deployed to a device via Capacitor
- Onboarding has been completed (app shows the main bottom-tab navigation)
- At least two languages are available in Settings (de and en)

## Smoke Test

1. Open the app
2. Navigate to Settings
3. Tap a different language (e.g., switch from Deutsch to English)
4. **Expected:** All visible text on the Settings page updates instantly to the selected language. No page reload, no navigation flash, no white screen.

## Test Cases

### 1. Language switch updates Settings page text

1. Navigate to Settings
2. Note the current language of all section headers, labels, and button text
3. Tap a different language in the language selector
4. **Expected:** All Settings page text (section headers, labels, buttons) updates to the new language instantly. The page does not reload — scroll position is preserved, no flash.

### 2. Language switch persists across navigation

1. In Settings, switch to a different language
2. Tap the "Programs" tab in the bottom navigation
3. Observe the Programs page text
4. Tap the "Exercises" tab
5. Observe the Exercises page text
6. Tap the "History" tab
7. **Expected:** All pages render in the newly selected language. Bottom navigation tab labels are also in the new language.

### 3. Language persists after app restart

1. In Settings, switch language (e.g., from Deutsch to English)
2. Close the app completely (force-quit, not just background)
3. Reopen the app
4. Navigate to Settings
5. **Expected:** The language selector shows the previously selected language. All app text is in that language.

### 4. Bottom navigation survives language switch

1. Navigate to Settings
2. Switch language
3. Observe the bottom navigation bar
4. **Expected:** Bottom navigation tabs update their labels to the new language. The tab bar does not disappear, flash, or re-animate during the switch.

### 5. Console diagnostics confirm overwrite wiring

1. Open browser DevTools (or Safari Web Inspector for device)
2. Reload the app
3. Check the console output
4. **Expected:** `[Locale] Overwrite wired — initial: de` (or current locale) appears once on startup.
5. Switch language in Settings
6. **Expected:** `[Locale] Switched: de → en` (or appropriate locales) appears in the console.

## Edge Cases

### Rapid language switching

1. Navigate to Settings
2. Tap language A, immediately tap language B, immediately tap language A again (rapid succession)
3. **Expected:** App settles on the last selected language without errors, crashes, or stale text. Console shows each switch logged.

### Switch language during active workout (if applicable)

1. Start a workout from a program
2. While in the active workout screen, use back navigation to reach Settings
3. Switch language
4. Return to the active workout
5. **Expected:** Workout UI text updates to the new language. Note: in-progress workout state may reset due to `{#key locale}` re-render — this is acceptable and expected behavior.

## Failure Signals

- Text does not update after tapping a different language → `overwriteGetLocale` not wired (reactive getter broken)
- Page reloads (white flash, scroll position lost, URL bar flickers) → `originalSetLocale` not called with `{ reload: false }` or original reference not saved before overwrite
- Bottom navigation disappears briefly → BottomNav is inside `{#key locale}` block (should be outside)
- Toast notifications or dark/light mode reset on switch → ModeWatcher/Toaster inside `{#key locale}` block
- `[Locale] Overwrite wired` not in console → imports or wiring calls missing
- Language reverts after app restart → localStorage persistence broken (originalSetLocale not called)

## Requirements Proved By This UAT

- R051 — No-Reload Language Switching: test cases 1-4 prove instant language switching without reload, cross-navigation persistence, and app-restart persistence

## Not Proven By This UAT

- Language switching behavior on actual iOS/Android devices (UAT can be run in browser dev mode, but native behavior should also be verified)
- Behavior with languages beyond de/en (if additional locales are added in the future)

## Notes for Tester

- The `state_referenced_locally` Svelte warning in the build output for `+layout.svelte:42` is known and harmless — it's a one-time startup log, not a reactive consumer.
- The `{#key locale}` wrapper intentionally tears down and recreates the content subtree. Any ephemeral component state (e.g., open drawers, form inputs) inside the content area will reset on language switch. This is expected behavior.

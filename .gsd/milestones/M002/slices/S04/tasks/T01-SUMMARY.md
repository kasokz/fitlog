---
id: T01
parent: S04
milestone: M002
provides:
  - loadProgressionSuggestions() orchestrator service for parallel per-exercise suggestion loading
  - ProgressionBanner.svelte display component with shadcn Alert, TrendingUp icon, dismiss button
  - 5 progression_banner_* i18n keys in de.json
key_files:
  - apps/mobile/src/lib/services/analytics/progressionSuggestionLoader.ts
  - apps/mobile/src/lib/components/workout/ProgressionBanner.svelte
  - apps/mobile/messages/de.json
key_decisions:
  - Mirrored sessionPRDetector pattern for parallel async + per-exercise error isolation
  - Used green tint on Alert (border-green-500/30 bg-green-500/5) with dark mode variant for progression banner
patterns_established:
  - "[Progression]" prefixed structured logging with exerciseCount, suggestionCount, durationMs
observability_surfaces:
  - "[Progression] Loading suggestions" — logged at start with exerciseCount
  - "[Progression] Suggestions loaded" — logged at end with exerciseCount, suggestionCount, durationMs
  - "[Progression] Exercise suggestion failed" — per-exercise error with exerciseId and error message
  - "[Progression] Loading failed" — top-level failure with error and durationMs
duration: 15m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Build progression suggestion loader and ProgressionBanner component

**Created `loadProgressionSuggestions()` orchestrator with parallel per-exercise loading and `ProgressionBanner.svelte` display component using shadcn Alert with TrendingUp icon and dismiss button.**

## What Happened

Built the two standalone pieces needed before workout page integration:

1. **progressionSuggestionLoader.ts** — Orchestrator that takes an array of exercise IDs, calls `getProgressionSuggestion()` in parallel via `Promise.all()`, with per-exercise try/catch for error isolation. Null results (insufficient data, bodyweight exercises) are silently skipped. Top-level try/catch ensures the function never throws — returns empty Map on failure. Structured `[Progression]` logging with timing mirrors the `[PR]` pattern from sessionPRDetector.

2. **ProgressionBanner.svelte** — Display component accepting `suggestion: ProgressionSuggestion` and `ondismiss: () => void` props. Uses shadcn Alert (default variant) with a green tint (`border-green-500/30 bg-green-500/5`) that works in both light and dark mode. Renders TrendingUp icon, title, suggested weight message with increment, and a reason line showing avg RIR and sessions analyzed. Ghost X button positioned top-right for dismissal.

3. **de.json** — Added 5 `progression_banner_*` i18n keys for title, message, reason, dismiss, and sessions analyzed.

## Verification

- `pnpm run build` — succeeds with zero errors (only pre-existing warnings from unrelated packages)
- `grep -c 'progression_' apps/mobile/messages/de.json` — returns 5 ✓
- `pnpm vitest run -t "progression"` — all 16 progressionAdvisor tests pass, no regression ✓
- Both new files exist and export their public API ✓

### Slice-level verification status (intermediate task)
- ✅ `pnpm run build` — zero build errors
- ✅ `pnpm vitest run -t "progression"` — 16/16 tests pass
- ✅ `grep -c 'progression_' apps/mobile/messages/de.json` — returns 5
- ⬜ Manual verification — deferred to T02 (requires workout page integration)

## Diagnostics

Filter browser console for `[Progression]` during workout page load to see:
- `[Progression] Loading suggestions { exerciseCount: N }` — start signal
- `[Progression] Suggestions loaded { exerciseCount: N, suggestionCount: N, durationMs: N }` — end signal with timing
- `[Progression] Exercise suggestion failed { exerciseId, error }` — per-exercise failure details
- `[Progression] Loading failed { error, durationMs }` — top-level failure (returns empty Map)

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/services/analytics/progressionSuggestionLoader.ts` — new orchestrator service with `loadProgressionSuggestions()` export
- `apps/mobile/src/lib/components/workout/ProgressionBanner.svelte` — new display component with suggestion + ondismiss props
- `apps/mobile/messages/de.json` — added 5 `progression_banner_*` i18n keys

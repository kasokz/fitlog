---
estimated_steps: 5
estimated_files: 3
---

# T01: Build progression suggestion loader and ProgressionBanner component

**Slice:** S04 — RIR Progression Suggestions in Workout
**Milestone:** M002

## Description

Create the two standalone pieces needed before workout page integration: (1) an orchestrator service `loadProgressionSuggestions()` that calls the S01 `getProgressionSuggestion()` in parallel per exercise with per-exercise error isolation and structured logging, and (2) a `ProgressionBanner.svelte` display component using the shadcn Alert with TrendingUp icon and a dismiss button. Also add the required i18n keys to de.json.

## Steps

1. Create `apps/mobile/src/lib/services/analytics/progressionSuggestionLoader.ts`:
   - Export `loadProgressionSuggestions(exerciseIds: UUID[]): Promise<Map<UUID, ProgressionSuggestion>>`
   - Use `Promise.all()` mapping over exerciseIds, calling `getProgressionSuggestion(id)` per exercise
   - Per-exercise try/catch: on error, log `[Progression] Exercise suggestion failed` with `{ exerciseId, error }` and skip (don't add to map)
   - On null result from advisor (insufficient data, bodyweight, etc.), skip — don't add to map
   - Log at start: `[Progression] Loading suggestions` with `{ exerciseCount }`
   - Log at end: `[Progression] Suggestions loaded` with `{ exerciseCount, suggestionCount, durationMs }`
   - Top-level try/catch: on failure, log `[Progression] Loading failed` with error, return empty Map (never throws)

2. Add i18n keys to `apps/mobile/messages/de.json`:
   - `progression_banner_title`: "Progression vorgeschlagen"
   - `progression_banner_message`: "Erhöhe auf {suggestedWeight} kg (+{increment} kg)"
   - `progression_banner_reason`: "Durchschnittliches RIR von {avgRir} über {sessions} Einheiten"
   - `progression_banner_dismiss`: "Ausblenden"
   - `progression_banner_sessions_analyzed`: "{sessions} Einheiten analysiert"

3. Create `apps/mobile/src/lib/components/workout/ProgressionBanner.svelte`:
   - Props interface: `{ suggestion: ProgressionSuggestion; ondismiss: () => void }`
   - Import Alert, AlertTitle, AlertDescription from `@repo/ui/components/ui/alert`
   - Import TrendingUp and X icons from `@lucide/svelte`
   - Import Button from `@repo/ui/components/ui/button`
   - Import `m` from paraglide messages
   - Render: Alert (default variant) with custom class for a subtle green/success tint (`border-green-500/30 bg-green-500/5` or similar that works in dark mode)
   - Alert contains TrendingUp icon, AlertTitle with `m.progression_banner_title()`, AlertDescription with `m.progression_banner_message({ suggestedWeight: suggestion.suggested_weight.toFixed(1), increment: suggestion.increment_kg.toFixed(1) })`
   - Below description: small text with `m.progression_banner_reason({ avgRir: suggestion.avg_rir.toFixed(1), sessions: String(suggestion.sessions_analyzed) })`
   - Dismiss: Button (ghost, size icon-sm or similar) with X icon, positioned top-right, calls `ondismiss`

4. Run `pnpm paraglide:compile` to generate message functions for new keys.

5. Run `pnpm run build` to verify both new files compile without errors.

## Must-Haves

- [ ] `loadProgressionSuggestions()` calls all exercises in parallel via `Promise.all()`
- [ ] Per-exercise error isolation — one failed exercise doesn't block others
- [ ] Structured `[Progression]` logging with timing mirrors `[PR]` pattern
- [ ] Top-level never-throw guarantee — returns empty Map on failure
- [ ] ProgressionBanner uses shadcn Alert component (not custom container)
- [ ] Banner has TrendingUp icon, suggestion text with weight/increment, dismiss button
- [ ] All 5 i18n keys added to de.json

## Verification

- `pnpm run build` succeeds with zero errors
- `grep -c 'progression_' apps/mobile/messages/de.json` returns ≥5
- Both new files exist and export their public API

## Observability Impact

- Signals added/changed: `[Progression] Loading suggestions`, `[Progression] Suggestions loaded`, `[Progression] Exercise suggestion failed`, `[Progression] Loading failed` — structured console logs with exerciseCount, suggestionCount, durationMs, and per-exercise error details
- How a future agent inspects this: Filter browser console for `[Progression]` during workout page load
- Failure state exposed: Per-exercise errors logged with exerciseId and error message; orchestrator failure logged with full error

## Inputs

- `apps/mobile/src/lib/services/analytics/progressionAdvisor.ts` — `getProgressionSuggestion()` function (S01, unchanged)
- `apps/mobile/src/lib/types/analytics.ts` — `ProgressionSuggestion` type (S01, unchanged)
- `apps/mobile/src/lib/services/analytics/sessionPRDetector.ts` — architectural pattern to follow for parallel async + error isolation
- `packages/ui/src/components/ui/alert/` — Alert, AlertTitle, AlertDescription components

## Expected Output

- `apps/mobile/src/lib/services/analytics/progressionSuggestionLoader.ts` — new orchestrator service with `loadProgressionSuggestions()` export
- `apps/mobile/src/lib/components/workout/ProgressionBanner.svelte` — new display component with suggestion + ondismiss props
- `apps/mobile/messages/de.json` — 5 new `progression_banner_*` keys added

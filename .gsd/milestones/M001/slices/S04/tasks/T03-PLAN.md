---
estimated_steps: 5
estimated_files: 7
---

# T03: Workout history UI — list and detail routes with i18n

**Slice:** S04 — Workout History & Body Weight
**Milestone:** M001

## Description

Build the workout history browsing experience: a list page showing completed workout sessions as cards, and a detail page showing full session data read-only. Both routes follow the established page patterns (init DB in $effect, loading/empty/error states, shadcn-svelte components). All user-facing text uses German i18n keys.

## Steps

1. Add `history_*` i18n keys to `apps/mobile/messages/de.json`:
   - `history_title` ("Trainingsverlauf"), `history_loading` ("Verlauf wird geladen..."), `history_empty_title` ("Noch keine Trainings"), `history_empty_description` ("Starte dein erstes Training, um deinen Verlauf zu sehen."), `history_back` ("Zurück"), `history_session_exercises` ("{count} Übungen"), `history_session_sets` ("{count} Sätze"), `history_session_duration` ("{minutes} Min."), `history_detail_title` ("Trainingsdetails"), `history_detail_loading` ("Details werden geladen..."), `history_detail_not_found` ("Training nicht gefunden"), `history_detail_not_found_description` ("Diese Trainingseinheit existiert nicht oder wurde gelöscht."), `history_detail_set_label` ("Satz {number}"), `history_detail_date` ("Datum"), `history_detail_duration` ("Dauer")

2. Create `src/routes/history/+layout.ts` with `export const ssr = false;`. Create `src/routes/history/[sessionId]/+layout.ts` with same.

3. Create `src/lib/components/history/SessionCard.svelte`:
   - Props: `CompletedSessionSummary` + `onclick` handler
   - Renders as a Card with: formatted date (Intl.DateTimeFormat), training day name as title, badges for exercise count / set count / duration
   - Uses shadcn Card, Badge components

4. Create `src/routes/history/+page.svelte`:
   - Follow exercises/+page.svelte pattern: init DB in $effect, load data, loading/empty/error states
   - Load sessions via `WorkoutRepository.getCompletedSessions()`
   - Render SessionCard for each session
   - Card click navigates to `/history/{sessionId}`
   - Back button at top to go to `/`
   - Empty state with appropriate icon and message

5. Create `src/lib/components/history/SessionDetail.svelte` and `src/routes/history/[sessionId]/+page.svelte`:
   - Page loads session via `WorkoutRepository.getSessionDetail(sessionId)`
   - SessionDetail component renders: date + duration header, then exercise groups (similar to workout page layout but read-only — no steppers, no checkboxes)
   - Each exercise group: exercise name heading, then rows showing set_number, weight, reps, RIR, set_type badge
   - Back button navigates to `/history`
   - Handle not-found and error states

## Must-Haves

- [ ] /history route shows completed sessions as cards with date, training day name, exercise count, duration
- [ ] /history/[sessionId] route shows full session detail read-only (exercises, sets, weight, reps, RIR, set type)
- [ ] Empty state when no completed sessions exist
- [ ] Loading and error states on both routes
- [ ] All text uses i18n keys from de.json
- [ ] +layout.ts with ssr=false in both route directories

## Verification

- `pnpm --filter mobile build` — build succeeds with no type errors
- `jq 'keys[]' apps/mobile/messages/de.json | grep -c '^history_'` returns >= 10
- Route files exist: `src/routes/history/+page.svelte`, `src/routes/history/[sessionId]/+page.svelte`

## Observability Impact

- Signals added/changed: None — UI pages use existing repository methods which already have logging
- How a future agent inspects this: Navigate to /history and /history/[id] routes; loading/error states are visible in UI
- Failure state exposed: Error states displayed in UI with message text; console errors from repository calls propagate to UI error state

## Inputs

- `src/lib/db/repositories/workout.ts` — getCompletedSessions, getSessionDetail (from T02)
- `src/lib/types/workout.ts` — CompletedSessionSummary, SessionDetailWithNames (from T02)
- `src/routes/exercises/+page.svelte` — pattern reference for list page structure
- `src/routes/workout/[sessionId]/+page.svelte` — pattern reference for session detail layout
- `apps/mobile/messages/de.json` — existing i18n keys for reference

## Expected Output

- `src/routes/history/+page.svelte` — history list page
- `src/routes/history/+layout.ts` — ssr=false
- `src/routes/history/[sessionId]/+page.svelte` — session detail page
- `src/routes/history/[sessionId]/+layout.ts` — ssr=false
- `src/lib/components/history/SessionCard.svelte` — session summary card
- `src/lib/components/history/SessionDetail.svelte` — session detail view
- `apps/mobile/messages/de.json` — history_* keys added

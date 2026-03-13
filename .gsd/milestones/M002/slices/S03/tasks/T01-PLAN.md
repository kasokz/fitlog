---
estimated_steps: 5
estimated_files: 3
---

# T01: Build session PR detection service and unit tests

**Slice:** S03 — PR Detection, Celebration & History
**Milestone:** M002

## Description

Create the `detectSessionPRs()` orchestration function that bridges the S01 `detectPRs()` pure function with the workout completion flow. This service takes a session ID and the in-memory exercise groups (already available in the workout page), queries historical sets for each exercise (excluding the current session to avoid self-comparison), runs `detectPRs()` per exercise in parallel, enriches results with exercise names, and returns a structured result. The entire function is wrapped in try/catch so PR detection failures never block workout completion.

Unit tests use the existing sql.js mock pattern to seed realistic multi-session data and verify correct PR detection at session boundaries.

## Steps

1. Create `apps/mobile/src/lib/services/analytics/sessionPRDetector.ts`:
   - Define `SessionPRResult` interface: `{ prs: EnrichedPR[], exerciseCount: number, detectionTimeMs: number }` where `EnrichedPR` extends `PR` with `exerciseName: string`.
   - Implement `detectSessionPRs(sessionId: UUID, exerciseGroups: { exerciseId: UUID, exerciseName: string, sets: WorkoutSet[] }[]): Promise<SessionPRResult>`.
   - For each exercise group: query `AnalyticsRepository.getExerciseSetsHistory(exerciseId)`, filter out sets with `session_id === sessionId` from the result (to exclude current session from history), call `detectPRs(exerciseId, group.sets, filteredHistory)`, enrich each PR with the exercise name.
   - Run all per-exercise detections in parallel via `Promise.all()`, catching per-exercise errors individually (log and skip that exercise, don't abort all).
   - Log structured diagnostics: `console.log('[PR] Session PR detection', { sessionId, exerciseCount, prCount, durationMs })`.
   - On top-level failure: `console.error('[PR] Detection failed', { sessionId, error })`, return empty result `{ prs: [], exerciseCount: 0, detectionTimeMs: 0 }`.

2. Create `apps/mobile/src/lib/services/analytics/__tests__/sessionPRDetector.test.ts`:
   - Use the existing sql.js mock pattern (see `prDetector.test.ts` as reference): `setupMockDatabase()`, dynamic imports after mock.
   - Test cases:
     - **Detects weight PR at session completion:** Seed 2 sessions for the same exercise. Second session has higher weight. `detectSessionPRs` returns weight_pr.
     - **Excludes current session from history:** Verify the current session's sets are not compared against themselves (would prevent any PR detection).
     - **Returns empty when no improvements:** Seed sessions where the latest session doesn't beat any previous records.
     - **Handles multiple exercises in parallel:** Seed a session with 3 exercises, verify PRs detected across all.
     - **Per-exercise error doesn't block others:** (May require mocking a broken exercise ID scenario — or test by verifying structure handles it.)
     - **Empty session returns empty result:** Session with no exercise groups returns `{ prs: [], exerciseCount: 0, ... }`.
   - Use `makeSet()` helper and seeding functions consistent with existing test patterns.

3. Export `SessionPRResult` and `EnrichedPR` types from the module for downstream consumption by the toast component.

## Must-Haves

- [ ] `detectSessionPRs()` excludes current session's sets from the historical comparison
- [ ] Per-exercise detection runs in parallel via `Promise.all()`
- [ ] Per-exercise errors are caught and logged individually (one bad exercise doesn't abort detection for others)
- [ ] Top-level try/catch returns empty result on failure (never throws)
- [ ] Structured `[PR]` console logs for both success and failure paths
- [ ] ≥5 unit tests covering the cases listed above

## Verification

- `pnpm test -- --grep "sessionPRDetector"` — all tests pass
- TypeScript compiles without errors: `cd apps/mobile && pnpm exec tsc --noEmit` (or `pnpm run build`)

## Observability Impact

- Signals added/changed: `[PR] Session PR detection` log with sessionId, exerciseCount, prCount, durationMs on success. `[PR] Detection failed` error log on failure. `[PR] Exercise detection failed` warning per-exercise on individual failures.
- How a future agent inspects this: grep console output for `[PR]` prefix during workout completion.
- Failure state exposed: Error messages include sessionId and exercise details for debugging. Empty result returned (not thrown) so callers can distinguish "no PRs" from "detection failed" via `exerciseCount === 0 && detectionTimeMs === 0`.

## Inputs

- `apps/mobile/src/lib/services/analytics/prDetector.ts` — `detectPRs()` pure function (S01, tested)
- `apps/mobile/src/lib/db/repositories/analytics.ts` — `AnalyticsRepository.getExerciseSetsHistory()` (S01)
- `apps/mobile/src/lib/types/analytics.ts` — `PR` type
- `apps/mobile/src/lib/services/analytics/__tests__/prDetector.test.ts` — test pattern reference

## Expected Output

- `apps/mobile/src/lib/services/analytics/sessionPRDetector.ts` — orchestration service with `detectSessionPRs()`, `SessionPRResult`, `EnrichedPR` exports
- `apps/mobile/src/lib/services/analytics/__tests__/sessionPRDetector.test.ts` — ≥5 passing unit tests

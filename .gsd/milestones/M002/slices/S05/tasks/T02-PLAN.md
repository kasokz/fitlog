---
estimated_steps: 5
estimated_files: 4
---

# T02: Create DeloadBanner and integrate into workout page with i18n keys

**Slice:** S05 — Deload Auto-Adjustment
**Milestone:** M002

## Description

Create a `DeloadBanner.svelte` component following the established `ProgressionBanner.svelte` pattern, and integrate it into the workout page. The banner shows when the session was created during a deload week, using the session's stored `mesocycle_week` compared against the mesocycle's `deload_week_number`. Add de.json base locale keys for all new banner text per AGENTS.md rules.

## Steps

1. **Add de.json i18n keys** for the deload banner. Keys needed:
   - `deload_banner_title` — "Deload-Woche"
   - `deload_banner_description` — "Gewichte auf ~60% reduziert. Fokus auf Erholung und Technik."
   - `deload_banner_week` — "Woche {week}" (shows which deload week)
   - `deload_banner_dismiss` — accessible dismiss label "Deload-Hinweis schließen"

2. **Create `DeloadBanner.svelte`** at `apps/mobile/src/lib/components/workout/DeloadBanner.svelte`:
   - Follow `ProgressionBanner.svelte` structure: `Alert` + `AlertTitle` + `AlertDescription` + dismiss `Button`
   - Props: `week: number` (the deload week number), `ondismiss: () => void`
   - Use amber/blue color theme: `border-amber-500/30 bg-amber-500/5 dark:border-amber-400/30 dark:bg-amber-400/5`
   - Icon: `TrendingDown` or `Minus` from `@lucide/svelte` (signaling reduction)
   - Title: `m.deload_banner_title()`
   - Description: `m.deload_banner_description()` with week indicator `m.deload_banner_week({ week })`
   - Dismiss button with `aria-label={m.deload_banner_dismiss()}`

3. **Integrate into workout page** `apps/mobile/src/routes/workout/[sessionId]/+page.svelte`:
   - Add state: `let isDeloadSession = $state(false)` and `let deloadWeek = $state<number | null>(null)` and `let deloadBannerDismissed = $state(false)`
   - In `loadSession()`, after loading session and program, if `session.mesocycle_id` is not null:
     - Fetch mesocycle: `const mesocycle = await ProgramRepository.getMesocycleByProgramId(session.program_id)`
     - If mesocycle exists and `session.mesocycle_week === mesocycle.deload_week_number` and `mesocycle.deload_week_number !== 0`:
       - Set `isDeloadSession = true` and `deloadWeek = session.mesocycle_week`
     - Wrap in try/catch — on error, silently skip (banner is non-critical)
   - In the template, before the `{#each exerciseGroups}` block, add:
     ```svelte
     {#if isDeloadSession && !deloadBannerDismissed && deloadWeek}
       <DeloadBanner week={deloadWeek} ondismiss={() => { deloadBannerDismissed = true; }} />
     {/if}
     ```
   - Import `DeloadBanner` and `ProgramRepository` (if not already imported)

4. **Verify build**: `pnpm run build` succeeds with zero errors. All i18n keys resolve. Component compiles.

5. **Verify graceful handling**: Ensure no banner shows when: (a) `mesocycle_id` is null, (b) mesocycle is deleted (getMesocycleByProgramId returns null), (c) session is not a deload week, (d) deload is disabled (`deload_week_number === 0`).

## Must-Haves

- [ ] `DeloadBanner.svelte` created following ProgressionBanner pattern with amber color theme
- [ ] Banner shows on workout page when session is in deload week
- [ ] Banner is dismissible and doesn't reappear after dismiss within the session
- [ ] Banner does NOT show for non-deload sessions or null mesocycle
- [ ] de.json keys added: `deload_banner_title`, `deload_banner_description`, `deload_banner_week`, `deload_banner_dismiss`
- [ ] `pnpm run build` passes

## Verification

- `pnpm run build` succeeds with zero errors
- Manual: Navigate to workout page for a deload-week session → banner visible with amber theme above exercise cards
- Manual: Navigate to workout page for a non-deload session → no banner visible
- Manual: Dismiss banner → it disappears and doesn't reappear on scroll

## Observability Impact

- Signals added/changed: None (banner is purely visual, deload detection for banner is read-only)
- How a future agent inspects this: Check for `DeloadBanner` component presence in DOM via browser tools. Check `isDeloadSession` state in component.
- Failure state exposed: If mesocycle lookup fails in the workout page, banner silently doesn't show (try/catch). No error visible to user — this is intentional since the banner is supplementary.

## Inputs

- `apps/mobile/src/lib/components/workout/ProgressionBanner.svelte` — pattern to follow (Alert structure, dismiss button, color theming)
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — workout page to integrate banner into
- `apps/mobile/src/lib/types/workout.ts` — `WorkoutSession` has `mesocycle_id` and `mesocycle_week`
- `apps/mobile/src/lib/db/repositories/program.ts` — `getMesocycleByProgramId()` for deload week lookup
- T01 output: pre-fill integration complete, so deload sessions now have reduced weights in DB

## Expected Output

- `apps/mobile/src/lib/components/workout/DeloadBanner.svelte` — new component
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — modified with deload detection and banner rendering
- `apps/mobile/messages/de.json` — 4 new deload banner keys added

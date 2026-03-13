---
id: T05
parent: S06
milestone: M001
provides:
  - Neobrutalist design polish across all page routes — border-2, shadow-md, press-down effects, font-mono numerics, consistent headers
key_files:
  - apps/mobile/src/lib/components/exercises/ExerciseCard.svelte
  - apps/mobile/src/lib/components/programs/ProgramCard.svelte
  - apps/mobile/src/lib/components/programs/TrainingDayCard.svelte
  - apps/mobile/src/lib/components/history/SessionCard.svelte
  - apps/mobile/src/lib/components/history/SessionDetail.svelte
  - apps/mobile/src/lib/components/bodyweight/BodyWeightList.svelte
  - apps/mobile/src/lib/components/onboarding/TemplateCard.svelte
  - apps/mobile/src/lib/components/workout/ExerciseCard.svelte
  - apps/mobile/src/routes/exercises/+page.svelte
  - apps/mobile/src/routes/programs/+page.svelte
  - apps/mobile/src/routes/programs/[id]/+page.svelte
  - apps/mobile/src/routes/history/+page.svelte
  - apps/mobile/src/routes/history/[sessionId]/+page.svelte
  - apps/mobile/src/routes/bodyweight/+page.svelte
  - apps/mobile/src/routes/onboarding/+page.svelte
  - apps/mobile/src/routes/settings/+page.svelte
  - apps/mobile/src/routes/workout/[sessionId]/+page.svelte
key_decisions:
  - Applied neobrutalist treatment at card component level (class overrides) rather than modifying the base shadcn Card component — keeps the shared UI library clean while allowing app-specific visual treatment
  - Removed back buttons from tab-level pages (history, bodyweight, settings) since BottomNav handles navigation — back buttons only remain on sub-pages (history/[sessionId], programs/[id], workout/[sessionId])
  - FABs repositioned from bottom-6 to bottom-24 to avoid overlap with the bottom nav bar
  - Used active: pseudo-class instead of hover: for press-down effects — mobile-first design where hover is irrelevant
patterns_established:
  - "Neobrutalist card pattern: border-2 border-border shadow-md on Card class prop; for interactive cards add transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
  - "Neobrutalist back button pattern: variant=ghost with border-2 border-border shadow-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
  - "Neobrutalist FAB pattern: border-2 border-border shadow-lg with active press-down, positioned at bottom-24 to clear bottom nav"
  - "Numeric values (weights, reps, dates, counts) get font-mono class for tabular alignment"
  - "Section headers get font-bold uppercase tracking-wide text-muted-foreground"
observability_surfaces:
  - "none — purely visual changes"
duration: 1 session
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T05: Neobrutalist polish pass — layout, home, and content pages

**Applied consistent neobrutalist design system (border-2, shadow-md, press-down effects, font-mono numerics) across all 8 card components and 8 page routes.**

## What Happened

Applied the neobrutalist design tokens from globals.css that were previously underutilized. The changes touch two layers:

**Card components (8 files):** ExerciseCard, ProgramCard, TrainingDayCard, SessionCard, SessionDetail, BodyWeightList, TemplateCard, and workout ExerciseCard all received `border-2 border-border shadow-md`. Interactive cards (those wrapping navigation or selection) also got the press-down effect (`active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`). Card titles upgraded from `font-medium` to `font-bold`.

**Page routes (8 files):** Consistent header pattern — bold `text-2xl` (or `text-3xl` for onboarding) titles. Removed redundant back buttons from tab-level pages (history, bodyweight, settings) since BottomNav handles that navigation. Sub-pages (history/[sessionId], programs/[id], workout/[sessionId]) retain neobrutalist-styled back buttons with border-2 and press-down effect. FABs repositioned to `bottom-24` to avoid bottom nav overlap. Exercise filters section wrapped in a neobrutalist card. Numeric values (weights, reps, dates, counts, durations) use `font-mono` throughout history, bodyweight, and program detail pages. Section headers use bold uppercase tracking-wide pattern.

## Verification

- `pnpm --filter mobile build` exits 0 — build directory exists with index.html
- `pnpm --filter mobile check` — no new errors introduced (all 10 errors are pre-existing in exercise-repository.test.ts and ExerciseForm.svelte)
- `grep -rl 'shadow-md' apps/mobile/src/lib/components/` — returns all 8 card component files
- `grep -l 'border-2' apps/mobile/src/routes/*/+page.svelte apps/mobile/src/routes/*/*/+page.svelte` — returns 6 page files
- `grep 'font-mono' apps/mobile/src/lib/components/history/SessionCard.svelte apps/mobile/src/lib/components/bodyweight/BodyWeightList.svelte` — confirms monospace on numeric displays

### Slice Verification Status (intermediate task — not all expected to pass):
- ✅ `pnpm --filter mobile build` exits 0, build/index.html exists
- ❌ iOS project — not yet created (future task)
- ❌ Android project — not yet created (future task)
- ✅ Haptics service exists with exported functions
- ✅ Haptic calls wired into workout components
- ✅ Settings page with mode toggle
- ✅ dnd-kit replaces chevron buttons
- ✅ BottomNav wired into layout
- ✅ Safe-area padding applied
- ✅ Key count: 236 > 230

## Diagnostics

None — purely visual. Future agents can grep for neobrutalist patterns:
- `grep -rl 'shadow-md' apps/mobile/src/lib/components/` — all cards with hard shadows
- `grep -rl 'border-2' apps/mobile/src/routes/` — pages with neobrutalist borders
- `grep -rl 'font-mono' apps/mobile/src/lib/components/` — monospace numeric displays
- `grep -rl 'active:translate' apps/mobile/src/` — press-down effect locations

## Deviations

- Removed back buttons from tab-level pages (history, bodyweight, settings) — these were vestigial from before BottomNav was added in T02. Not in the plan but a natural cleanup.
- Used `active:` pseudo-class instead of `hover:` for press-down effects — the plan specified `hover:` but `active:` is correct for mobile-first touch interactions where hover doesn't apply.
- FABs repositioned from `bottom-6` to `bottom-24` — necessary to clear the bottom nav bar (20 units = pb-20), not explicitly in the plan.

## Known Issues

- Pre-existing type errors (10) in exercise-repository.test.ts and ExerciseForm.svelte — unrelated to this task
- Pre-existing warnings (3) in toggle-group.svelte about state_referenced_locally — unrelated

## Files Created/Modified

- `apps/mobile/src/lib/components/exercises/ExerciseCard.svelte` — border-2 shadow-md, press-down effect, font-bold title
- `apps/mobile/src/lib/components/programs/ProgramCard.svelte` — border-2 shadow-md, press-down effect, font-bold title, font-mono count
- `apps/mobile/src/lib/components/programs/TrainingDayCard.svelte` — border-2 shadow-md, press-down effect, font-bold title, font-mono count, neobrutalist play button
- `apps/mobile/src/lib/components/history/SessionCard.svelte` — border-2 shadow-md, press-down effect, font-bold title, font-mono date/counts
- `apps/mobile/src/lib/components/history/SessionDetail.svelte` — border-2 shadow-md cards, font-mono numerics (dates, weights, reps, RIR), font-bold titles
- `apps/mobile/src/lib/components/bodyweight/BodyWeightList.svelte` — border-2 shadow-md, font-mono weight and date
- `apps/mobile/src/lib/components/onboarding/TemplateCard.svelte` — border-2 shadow-md, press-down effect, font-bold title, neobrutalist icon container
- `apps/mobile/src/lib/components/workout/ExerciseCard.svelte` — border-2 shadow-md, font-bold title
- `apps/mobile/src/routes/exercises/+page.svelte` — neobrutalist FAB, font-mono count, filter section in card
- `apps/mobile/src/routes/programs/+page.svelte` — neobrutalist FAB, font-mono count
- `apps/mobile/src/routes/programs/[id]/+page.svelte` — neobrutalist back button, bold section headers, mesocycle card border-2 shadow-md, font-mono mesocycle data, neobrutalist FAB and define button
- `apps/mobile/src/routes/history/+page.svelte` — removed unnecessary back button, cleaned imports
- `apps/mobile/src/routes/history/[sessionId]/+page.svelte` — neobrutalist back button, text-2xl font-bold title
- `apps/mobile/src/routes/bodyweight/+page.svelte` — removed unnecessary back button, neobrutalist FAB, cleaned imports
- `apps/mobile/src/routes/onboarding/+page.svelte` — text-3xl bold header, adjusted subtitle
- `apps/mobile/src/routes/settings/+page.svelte` — removed unnecessary back button, bold uppercase section header, cleaned imports
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — neobrutalist back button, text-2xl font-bold title

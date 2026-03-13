---
estimated_steps: 4
estimated_files: 8
---

# T05: Neobrutalist polish pass — layout, home, and content pages

**Slice:** S06 — Design Polish & Platform Builds
**Milestone:** M001

## Description

Apply consistent neobrutalist styling across all page routes. The design system tokens (hard shadows, 0px radius, oklch colors, DM Sans + Space Mono fonts) are already defined in `globals.css` but are underutilized. This task focuses on page-level structure: consistent header patterns, card treatments with bold borders and hard shadows, improved empty states, and monospace numerics. This is the primary task delivering R009 (striking mobile UI).

## Steps

1. Define a consistent page header pattern and apply it to all routes — Each page gets a bold `text-2xl font-bold` title with optional subtitle in `text-muted-foreground`. Back buttons (where present) get neobrutalist treatment: `border-2 border-border` with hard shadow. Apply to: exercises, programs, programs/[id], history, history/[sessionId], bodyweight, workout/[sessionId], settings.
2. Enhance all Card usages across page routes — Add `border-2 border-border shadow-md` to Card components used in page content (exercise list cards, program list cards, session list cards, body weight entries). Use `hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all` for interactive cards (those that navigate on click) to create a press-down effect.
3. Polish specific page routes:
   - **Home (`+page.svelte`)**: Since T02 may redirect to programs or show a dashboard, style whatever remains with bold typography and neobrutalist cards.
   - **Exercises**: Enhance ExerciseCard hover states, style filters section with clear visual separation.
   - **Programs**: Style ProgramCard with hard shadows, make "create" button bold with neobrutalist button treatment.
   - **Programs/[id]**: Style training day sections with clear visual hierarchy, bold section headers.
   - **History**: Style SessionCard with date in `font-mono`, bold exercise summary.
   - **Body Weight**: Style entries with `font-mono` for numbers, clear add-entry CTA.
   - **Onboarding**: Ensure template cards are visually striking with hard shadows and clear selection state.
4. Run `pnpm --filter @repo/mobile check` to verify no type errors from styling changes.

## Must-Haves

- [ ] All page routes use consistent header pattern (bold title, appropriate size)
- [ ] Cards across all pages have `border-2 border-border shadow-md` neobrutalist treatment
- [ ] Interactive cards have press-down hover/active effect
- [ ] Numeric values (weights, reps, dates, counts) use `font-mono` for tabular alignment
- [ ] Empty states are styled consistently
- [ ] No type errors introduced by styling changes

## Verification

- `pnpm --filter @repo/mobile check` exits 0
- `grep -l 'shadow-md' apps/mobile/src/routes/*/+page.svelte apps/mobile/src/routes/*/*/+page.svelte` returns multiple page files
- `grep -l 'border-2' apps/mobile/src/routes/*/+page.svelte apps/mobile/src/routes/*/*/+page.svelte` returns multiple page files
- `grep 'font-mono' apps/mobile/src/routes/history/+page.svelte apps/mobile/src/routes/bodyweight/+page.svelte` confirms monospace on numeric pages

## Observability Impact

- Signals added/changed: None — purely visual changes
- How a future agent inspects this: Grep for neobrutalist class patterns (`shadow-md`, `border-2`, `font-mono`) across routes
- Failure state exposed: None — styling is non-functional

## Inputs

- All page routes from S01–S05 (functional but plain styling)
- `packages/ui/src/globals.css` — Neobrutalist design tokens (shadows, radius, colors, fonts)
- `packages/ui/src/components/ui/card/` — shadcn-svelte Card component
- T02 output — Layout and home page structure (BottomNav, safe-area)

## Expected Output

- `apps/mobile/src/routes/+page.svelte` — Polished home/dashboard
- `apps/mobile/src/routes/exercises/+page.svelte` — Neobrutalist exercise browsing
- `apps/mobile/src/routes/programs/+page.svelte` — Neobrutalist program list
- `apps/mobile/src/routes/programs/[id]/+page.svelte` — Polished program detail
- `apps/mobile/src/routes/history/+page.svelte` — Polished history with monospace dates
- `apps/mobile/src/routes/history/[sessionId]/+page.svelte` — Polished session detail
- `apps/mobile/src/routes/bodyweight/+page.svelte` — Polished body weight page
- `apps/mobile/src/routes/onboarding/+page.svelte` — Polished onboarding

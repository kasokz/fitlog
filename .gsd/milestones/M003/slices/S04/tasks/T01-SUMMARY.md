---
id: T01
parent: S04
milestone: M003
provides:
  - 5 premium program template data files with distinct training methodologies
  - ProgramTemplate interface extended with optional premium field
  - Template registry with PREMIUM_PROGRAM_TEMPLATES and ALL_TEMPLATES exports
key_files:
  - apps/mobile/src/lib/data/templates/types.ts
  - apps/mobile/src/lib/data/templates/periodized-strength-531.ts
  - apps/mobile/src/lib/data/templates/linear-progression-lp.ts
  - apps/mobile/src/lib/data/templates/tiered-volume-method.ts
  - apps/mobile/src/lib/data/templates/periodized-hypertrophy.ts
  - apps/mobile/src/lib/data/templates/strength-endurance-block.ts
  - apps/mobile/src/lib/data/templates/index.ts
key_decisions:
  - none
patterns_established:
  - Premium templates follow exact same ProgramTemplate shape as free templates, with premium: true flag
  - PROGRAM_TEMPLATES (free only) kept separate from PREMIUM_PROGRAM_TEMPLATES for onboarding safety
  - ALL_TEMPLATES combines both via spread for template browsing UI
observability_surfaces:
  - none — pure data files with no runtime behavior
duration: 25m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Author 5 premium template data files and extend type/registry

**Created 5 premium program templates (531 periodization, linear progression, tiered volume, hypertrophy, strength-endurance) with type extension and registry exports.**

## What Happened

Extended `ProgramTemplate` interface with optional `premium?: boolean` field (backwards compatible — existing free templates unchanged). Created 5 premium template data files, each representing a genuinely distinct training philosophy:

1. **Periodized Strength 531** — 4-day, 7 weeks. Dedicated days for Squat/Bench/Deadlift/Press with heavy main lift (5×3-5) plus accessories.
2. **Linear Progression LP** — 4-day upper/lower, 6 weeks. Heavy days (3-5 reps) alternating with volume days (8-12 reps).
3. **Tiered Volume Method** — 4-day, 6 weeks. T1/T2/T3 tier structure per day: heavy compound → moderate compound → high-rep isolation.
4. **Periodized Hypertrophy** — 5-day Push/Pull/Legs/Upper/Lower, 8 weeks. Higher rep ranges (8-15), more isolation work.
5. **Strength-Endurance Block** — 3-day full body, 6 weeks. Daily undulating periodization: heavy/moderate/volume days.

Updated `index.ts` with named exports for all 5, `PREMIUM_PROGRAM_TEMPLATES` array (5 templates), and `ALL_TEMPLATES` array (8 total). `PROGRAM_TEMPLATES` unchanged (3 free templates, onboarding safe).

All 36 unique exercise names across the 5 templates were verified to exactly match SEED_EXERCISES entries. No trademarked names, no emojis.

## Verification

- `pnpm run build` — zero errors, built successfully
- Exercise name audit: all 36 unique exercise names in premium templates match SEED_EXERCISES exactly (automated grep comparison)
- `PROGRAM_TEMPLATES` still exports exactly 3 free templates (FULL_BODY, UPPER_LOWER, PPL)
- `PREMIUM_PROGRAM_TEMPLATES` exports exactly 5 premium templates
- `ALL_TEMPLATES` exports 8 combined templates
- Each template has unique `id`, `premium: true`, meaningful description, correct mesocycle defaults
- No trademarked methodology names (no Wendler, nSuns, GZCL, etc.)
- No emojis in any template file
- `cd apps/mobile && pnpm test` — 409 tests pass (baseline maintained, no regressions)

### Slice-level checks (partial — T01 is intermediate task):
- ✅ `pnpm run build` — zero errors
- ✅ `PROGRAM_TEMPLATES` still 3 free templates (onboarding unchanged)
- ⬜ Test count >= 420 — tests not yet extended for premium templates (T02 scope)
- ⬜ Premium template integrity in test suite — T02 scope
- ⬜ Premium template creation test — T02 scope
- ⬜ i18n key counts — T04 scope

## Diagnostics

Pure data files — no runtime diagnostics. Future agents can inspect template data by reading the files directly or checking `ALL_TEMPLATES` export. Build-time type errors surface if `ProgramTemplate` shape changes. Runtime `createProgramFromTemplate()` fails fast listing unresolved exercise names (D033).

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/data/templates/types.ts` — Added `premium?: boolean` field to ProgramTemplate interface
- `apps/mobile/src/lib/data/templates/periodized-strength-531.ts` — New: 4-day, 7-week strength periodization template
- `apps/mobile/src/lib/data/templates/linear-progression-lp.ts` — New: 4-day, 6-week upper/lower with linear progression
- `apps/mobile/src/lib/data/templates/tiered-volume-method.ts` — New: 4-day, 6-week T1/T2/T3 tiered structure template
- `apps/mobile/src/lib/data/templates/periodized-hypertrophy.ts` — New: 5-day, 8-week hypertrophy-focused template
- `apps/mobile/src/lib/data/templates/strength-endurance-block.ts` — New: 3-day, 6-week DUP full body template
- `apps/mobile/src/lib/data/templates/index.ts` — Added all premium exports, PREMIUM_PROGRAM_TEMPLATES, and ALL_TEMPLATES arrays

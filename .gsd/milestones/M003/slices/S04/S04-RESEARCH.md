# S04: Premium Program Templates — Research

**Date:** 2026-03-12

## Summary

S04 adds 5 premium program templates based on established strength training methodologies, integrates them into the existing template system with a `premium` flag, and builds the UI for browsing/selecting premium vs. free templates with purchase gating. The scope is narrow and well-constrained because the existing infrastructure does almost all the heavy lifting: the `ProgramTemplate` type and `createProgramFromTemplate()` service are proven and reusable as-is (D032, D033), the `PremiumFeature.premium_templates` enum and `FEATURE_PRODUCT_MAP` entry already exist (S02/T01), the `canAccessFeature()` gate is ready, and the `PaywallDrawer` from S03 handles the purchase flow including the template pack product (`PRODUCT_IDS.TEMPLATE_PACK`).

The primary work is (a) authoring 5 high-quality template data files using only exercises from the 55-exercise seed set, (b) extending `ProgramTemplate` type with an optional `premium` boolean, (c) creating a template browsing UI accessible from the Programs page (the current code has NO template selection surface outside onboarding — this needs to be built), and (d) gating creation from premium templates behind `canAccessFeature(PremiumFeature.premium_templates)`. The templates must use generic descriptive names per D069 to avoid trademark issues.

The risk profile is low. No native plugin integration, no platform-specific behavior, no store interactions. The only real risk is template content quality — the exercises, sets, reps, and periodization must be accurate and valuable to justify purchase. All exercise names must exactly match `SEED_EXERCISES` entries (D032) — the existing test suite validates this constraint.

## Recommendation

**Approach:** Create 5 premium template files in `src/lib/data/templates/` following the exact same `ProgramTemplate` shape as the existing 3 free templates. Add an optional `premium?: boolean` field to `ProgramTemplate` (backwards compatible — existing templates default to `false`/`undefined`). Extend `PROGRAM_TEMPLATES` with a new `PREMIUM_PROGRAM_TEMPLATES` export (or a combined `ALL_TEMPLATES` with the premium flag). Build a "Create from Template" surface accessible from the Programs page — a Drawer with template cards showing free/premium distinction (lock icon on premium). Premium template creation gated by `canAccessFeature(PremiumFeature.premium_templates)` — if not purchased, tapping a premium template opens `PaywallDrawer` instead.

**Template methodologies (D069-compliant names):**
1. **Periodized Strength 531** — 5/3/1-inspired: 4-day, main lifts with percentages approximated via rep ranges (Week 1: 5×5, Week 2: 3×5, Week 3: 1×5 + AMRAP spirit captured in low-rep high-set). 7 weeks, deload week 7.
2. **Linear Progression LP** — nSuns/GZCLP-inspired: 4-day upper/lower with heavy main lifts (3-5 reps) + volume backoff (8-12 reps). 6 weeks, deload week 6.
3. **Tiered Volume Method** — GZCL-inspired: 4-day with T1 heavy compound (3-5 reps), T2 moderate compound (6-10 reps), T3 isolation (12-15 reps) tiers per day. 6 weeks, deload week 6.
4. **Periodized Hypertrophy** — Hypertrophy-focused: 5-day bro-split-meets-PPL with moderate weight, higher rep ranges (8-15), more isolation work. 8 weeks, deload week 8.
5. **Strength-Endurance Block** — DUP/conjugate-inspired: 3-day full body with daily undulation (heavy/moderate/light days). 6 weeks, deload week 6.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Template data structure | `ProgramTemplate` type in `types.ts` | Proven type with `createProgramFromTemplate()` that handles exercise resolution, program/day/assignment/mesocycle creation. Zero changes needed for creation flow. |
| Exercise name → ID resolution | `ExerciseRepository.getByName()` + fail-fast strategy (D032, D033) | Exact match, no partial matching risk. Fail-fast prevents orphan programs. |
| Premium gate for templates | `canAccessFeature(PremiumFeature.premium_templates)` | Already mapped to `PRODUCT_IDS.TEMPLATE_PACK` in `FEATURE_PRODUCT_MAP`. Just call it. |
| Purchase flow for template pack | `PaywallDrawer` component | Already handles template pack product display, purchase, and success callback. |
| Template card UI | `TemplateCard` component from onboarding | Reusable with minor extension (add premium badge/lock icon). |
| Drawer for template selection | vaul-svelte `Drawer` (D079 pattern) | 6+ existing usages in codebase. Consistent with Programs page create flow. |
| Template data integrity tests | `template-service.test.ts` | Existing test validates all exercise names exist in SEED_EXERCISES. Just needs to include premium templates. |

## Existing Code and Patterns

- `apps/mobile/src/lib/data/templates/types.ts` — `ProgramTemplate` interface. Needs a `premium?: boolean` field added. Currently has `id`, `name`, `description`, `days[]`, `mesocycleDefaults`.
- `apps/mobile/src/lib/data/templates/index.ts` — Registry exporting `PROGRAM_TEMPLATES` array (3 free templates) and individual named exports. Extend with premium template exports and a combined list or separate `PREMIUM_PROGRAM_TEMPLATES`.
- `apps/mobile/src/lib/data/templates/ppl.ts` — Reference pattern for template data files. Each file exports a single `ProgramTemplate` constant. Premium templates follow this exact pattern with `premium: true`.
- `apps/mobile/src/lib/db/services/template-service.ts` — `createProgramFromTemplate(template)` takes any `ProgramTemplate` and creates the full program structure. Works as-is for premium templates — no awareness of premium flag needed (gating happens at UI level).
- `apps/mobile/src/lib/services/premium.ts` — `canAccessFeature(PremiumFeature.premium_templates)` checks `TEMPLATE_PACK` ownership. `PremiumFeature.premium_templates` enum value already exists.
- `apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` — Already supports `feature="premium_templates"` with localized description.
- `apps/mobile/src/lib/components/premium/PaywallDrawer.svelte` — Full purchase flow with template pack section. `onpurchasecomplete` callback for post-purchase reactivity.
- `apps/mobile/src/lib/components/onboarding/TemplateCard.svelte` — Card component showing template name, description, day count badge. Can be generalized or cloned for the template selection UI (add premium indicator).
- `apps/mobile/src/routes/programs/+page.svelte` — Programs list page with FAB "Create Program" button opening a Drawer with `ProgramForm`. This is where template selection should be added — either as a second FAB action or integrated into the create flow.
- `apps/mobile/src/lib/db/__tests__/template-service.test.ts` — 3 test groups: data integrity (exercise names, day counts, rep ranges, uniqueness), getByName, createProgramFromTemplate. Premium templates must be included in these integrity tests.
- `apps/mobile/src/lib/db/seed/exercises.ts` — 55 seed exercises. All premium template exercises must use exact names from this list. Available exercises: Squat, Front Squat, Deadlift, Bench Press, Incline Bench Press, Close-Grip Bench Press, Overhead Press, Barbell Row, Romanian Deadlift, T-Bar Row, Good Morning, Hip Thrust, Pull-Up, Lat Pulldown, Cable Row, Dumbbell Row, Arnold Press, Lateral Raise, Front Raise, Reverse Fly, Face Pull, Barbell Curl, Dumbbell Curl, Hammer Curl, Cable Curl, Tricep Pushdown, Overhead Tricep Extension, Skull Crusher, Leg Press, Leg Extension, Leg Curl, Bulgarian Split Squat, Standing Calf Raise, Seated Calf Raise, Hanging Leg Raise, Cable Crunch, Plank, Ab Wheel Rollout, Dumbbell Fly, Cable Crossover, Push-Up, Chest Dip, Nordic Curl, Glute Bridge, Cable Kickback, Step-Up, Upright Row, Wrist Curl, Reverse Wrist Curl, Clean and Press, Thruster, Kettlebell Swing, Kettlebell Goblet Squat, Band Pull-Apart, Band Face Pull.

## Constraints

- **All exercise names must exactly match SEED_EXERCISES** — `ExerciseRepository.getByName()` uses `WHERE name = ?` (D032). No fuzzy matching. Misspellings = template creation failure.
- **No trademarked methodology names** — D069 requires generic descriptive names. No "Wendler 5/3/1", "nSuns", "GZCL", "Starting Strength". Use descriptive alternatives.
- **`ProgramTemplate` type change must be backwards-compatible** — The `premium` field must be optional (`premium?: boolean`) so existing templates don't need modification.
- **Template creation reuses existing `createProgramFromTemplate()`** — No changes to the template service. Premium gating is a UI concern, not a data concern.
- **i18n: German is base locale** — All new UI text keys must go in `de.json` first, then `en.json`. Key count must remain synchronized. However, full i18n for all locales is S07 scope — S04 only needs de + en for template-specific keys.
- **No emojis** — AGENTS.md constraint applies to template names and descriptions too.
- **One template pack product** — `PRODUCT_IDS.TEMPLATE_PACK` is a single one-time purchase that unlocks all 5 premium templates. No per-template purchasing.
- **Current test count: 409** — Must not decrease. Premium templates add to existing integrity tests.

## Common Pitfalls

- **Exercise name typo → template creation hard failure** — `createProgramFromTemplate` fails fast if ANY exercise name is unresolved (D033). Every exercise name must be copied exactly from `SEED_EXERCISES`. The existing test suite catches this, but only if premium templates are included in the test.
- **Forgetting to add premium templates to test suite** — The `template-service.test.ts` tests iterate `PROGRAM_TEMPLATES`. If premium templates are in a separate export (`PREMIUM_PROGRAM_TEMPLATES`), the tests must also iterate them, or they won't be validated.
- **Template content too generic** — Premium templates must be meaningfully different from the 3 free templates. If a premium template is just "another PPL with slightly different exercises," it's not worth paying for. Each should represent a distinct training philosophy/periodization approach.
- **Missing premium gate → free users can create from premium templates** — The gate must be checked before calling `createProgramFromTemplate()`. If the UI only hides the lock icon but doesn't actually check `canAccessFeature()`, the gate is cosmetic-only.
- **Programs page create flow disruption** — The current Programs page has a single "Create Program" FAB → Drawer with a blank form. Adding template selection must not break this existing manual creation flow.
- **Onboarding page not affected** — Onboarding shows only `PROGRAM_TEMPLATES` (3 free). Premium templates should NOT appear in onboarding — new users shouldn't see paywalls before their first workout.

## Open Risks

- **Template content quality** — The 5 methodologies must be accurately represented with appropriate exercises, set/rep schemes, and mesocycle structures. Inaccurate periodization (e.g., wrong rep ranges for a 5/3/1-style program) would undermine the premium value proposition. Mitigation: each template will be designed based on established training principles, and the data integrity tests will validate structural correctness.
- **Template selection UI placement** — The Programs page currently has only manual creation. Adding template selection changes the user flow. Two approaches: (a) "Create from Template" as a second action alongside manual creation, or (b) a template browser as a separate section on the Programs page. Recommendation: approach (a) via a secondary button or tab in the create Drawer, keeping the existing manual flow untouched.
- **No live testing of purchase gate** — Template pack purchase requires native sandbox. S04 can only verify the gate logic in tests and dev-mode toggle. Real purchase-flow testing happens in S06. Mitigation: the gate uses the same `canAccessFeature()` infrastructure already tested in S02 (51 assertions).

## Skills Discovered

| Technology | Skill | Status | Recommendation |
|------------|-------|--------|----------------|
| Strength training programs | `borisghidaglia/science-based-lifter@program-creation` | available (22 installs) | Consider for template content accuracy — could inform periodization design |
| Hypertrophy training | `disco-trooper/skills@hypertrophy-training` | available (8 installs) | Low priority — one of 5 templates is hypertrophy-focused |
| Svelte frontend | `windmill-labs/windmill@svelte-frontend` | available (68 installs) | Skip — not relevant (Windmill-specific) |
| Capacitor | `cap-go/capacitor-skills@capacitor-best-practices` | available (296 installs) | Already noted in M003 research — no additional value for S04 (no native work) |

## Sources

- Existing template system: `ProgramTemplate` type, `createProgramFromTemplate()`, `PROGRAM_TEMPLATES` registry, `TemplateCard` component, `template-service.test.ts` (55 exercises in seed data, 3 free templates, fail-fast name resolution)
- Premium infrastructure from S02: `PremiumFeature.premium_templates` enum, `canAccessFeature()`, `FEATURE_PRODUCT_MAP` mapping `premium_templates → TEMPLATE_PACK`, `grantPurchase()`, revalidation lifecycle
- Paywall from S03: `PaywallDrawer` component with template pack section, `onpurchasecomplete` callback, `paywall-constants.ts`
- Purchase plugin from S01: `PRODUCT_IDS.TEMPLATE_PACK = 'com.fitlog.app.templates.pack'`, `PURCHASE_TYPE.INAPP`
- Decisions register: D032 (exact name match), D033 (fail-fast resolution), D067 (granular product tracking), D069 (generic template names), D079 (Drawer pattern)
- Seed exercises: 55 exercises across all muscle groups and equipment types in `exercises.ts`

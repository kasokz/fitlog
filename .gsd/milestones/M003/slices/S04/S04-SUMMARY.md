---
id: S04
parent: M003
milestone: M003
provides:
  - 5 premium program template data files with distinct training methodologies (531, LP, Tiered Volume, Hypertrophy, Strength-Endurance)
  - ProgramTemplate interface extended with optional premium field (backwards compatible)
  - Template registry with PROGRAM_TEMPLATES (3 free), PREMIUM_PROGRAM_TEMPLATES (5 premium), ALL_TEMPLATES (8 combined)
  - 19 new tests covering premium template data integrity and createProgramFromTemplate
  - TemplateBrowserDrawer and TemplateBrowserCard components with premium gate and PaywallDrawer integration
  - "From Template" secondary FAB on Programs page alongside existing "Create Program"
  - 9 new i18n keys (programs_template_*) in de.json and en.json
requires:
  - slice: S02
    provides: Premium gate infrastructure with canAccessFeature(PremiumFeature.premium_templates) and granular product checks
affects:
  - S05 (store listing uses premium template descriptions)
  - S07 (i18n keys already added for de+en, other locales in S07)
key_files:
  - apps/mobile/src/lib/data/templates/types.ts
  - apps/mobile/src/lib/data/templates/periodized-strength-531.ts
  - apps/mobile/src/lib/data/templates/linear-progression-lp.ts
  - apps/mobile/src/lib/data/templates/tiered-volume-method.ts
  - apps/mobile/src/lib/data/templates/periodized-hypertrophy.ts
  - apps/mobile/src/lib/data/templates/strength-endurance-block.ts
  - apps/mobile/src/lib/data/templates/index.ts
  - apps/mobile/src/lib/db/__tests__/template-service.test.ts
  - apps/mobile/src/lib/components/programs/TemplateBrowserCard.svelte
  - apps/mobile/src/lib/components/programs/TemplateBrowserDrawer.svelte
  - apps/mobile/src/routes/programs/+page.svelte
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - D083 — Template browsing UI as secondary "From Template" action alongside existing FAB, not replacing it
  - D084 — Separate PROGRAM_TEMPLATES (free) and PREMIUM_PROGRAM_TEMPLATES (premium) + combined ALL_TEMPLATES to protect onboarding
  - D085 — Template names/descriptions hardcoded English in data files (matching free template pattern), UI chrome i18n'd
patterns_established:
  - Premium templates follow exact same ProgramTemplate shape as free templates, with premium: true flag
  - PROGRAM_TEMPLATES (free only) kept separate from PREMIUM_PROGRAM_TEMPLATES for onboarding safety
  - ALL_TEMPLATES combines both via spread for template browsing UI
  - Premium-gated template selection: check canAccessFeature() on drawer open, gate selection, open PaywallDrawer for locked templates
  - PaywallDrawer onpurchasecomplete re-checks premium access and updates lock state in-place
  - programs_template_* key prefix for template browsing UI strings
observability_surfaces:
  - "[Premium] canAccessFeature(premium_templates)" logs on drawer open show gate result
  - "[TemplateService]" prefixed logs cover program creation flow
  - "[TemplateBrowser] Creation failed" console error on template creation failure
  - Toast notifications for success/error states visible in UI
  - Dev override via setPremiumStatus(true) enables premium template access for testing
drill_down_paths:
  - .gsd/milestones/M003/slices/S04/tasks/T01-SUMMARY.md
  - .gsd/milestones/M003/slices/S04/tasks/T02-SUMMARY.md
  - .gsd/milestones/M003/slices/S04/tasks/T03-SUMMARY.md
  - .gsd/milestones/M003/slices/S04/tasks/T04-SUMMARY.md
duration: ~57m across 4 tasks
verification_result: passed
completed_at: 2026-03-13
---

# S04: Premium Program Templates

**5 premium program templates with template browsing Drawer, premium gate enforcement, and PaywallDrawer integration on the Programs page.**

## What Happened

Created 5 premium program templates representing distinct training philosophies: Periodized Strength 531 (4-day, 7wk), Linear Progression LP (4-day upper/lower, 6wk), Tiered Volume Method (4-day T1/T2/T3, 6wk), Periodized Hypertrophy (5-day PPL+UL, 8wk), and Strength-Endurance Block (3-day full body DUP, 6wk). All 36 unique exercise names across templates verified against SEED_EXERCISES. Extended `ProgramTemplate` with optional `premium?: boolean` field and added registry exports (`PREMIUM_PROGRAM_TEMPLATES`, `ALL_TEMPLATES`). Existing `PROGRAM_TEMPLATES` unchanged at 3 free templates.

Added 19 tests (428 total, up from 409 baseline) covering premium template data integrity (exercise name resolution, rep ranges, day counts, uniqueness, mesocycle defaults) and end-to-end `createProgramFromTemplate()` for a premium template.

Built `TemplateBrowserDrawer` and `TemplateBrowserCard` components. The drawer lists all 8 templates in free/premium sections, checks `canAccessFeature(PremiumFeature.premium_templates)` on open, and gates premium template selection — opens PaywallDrawer if not purchased, calls `createProgramFromTemplate()` if purchased. Post-purchase callback re-checks premium status for immediate unlock. Added "From Template" outline FAB on Programs page alongside existing "Create Program" button.

Added 9 i18n keys with `programs_template_*` prefix to both de.json and en.json (365 keys each, zero drift). All component strings use `m.*()` calls.

## Verification

- `pnpm test` — **428 tests passed** (17 test files, 0 failures) — exceeds 420 threshold
- `pnpm run build` — zero errors, built in ~34s
- i18n key counts: de.json = 365, en.json = 365 (identical, zero drift)
- `PROGRAM_TEMPLATES` still exactly 3 free templates (onboarding unchanged)
- `PREMIUM_PROGRAM_TEMPLATES` = 5 templates, all with `premium: true`
- `ALL_TEMPLATES` = 8 combined templates with unique IDs
- All 36 exercise names resolve against SEED_EXERCISES
- 9 `programs_template_*` keys present in both locale files
- No hardcoded strings in TemplateBrowserCard or TemplateBrowserDrawer components
- Premium gate enforced via `canAccessFeature()` (not just cosmetic lock icons)

## Requirements Advanced

- R021 (Premium Program Templates) — 5 premium templates authored, registered, tested, and browsable with purchase gate. Core deliverable complete.
- R023 (Paywall UX & Upgrade Flows) — Template browsing integrates PaywallDrawer for locked premium templates, extending the paywall surface from S03.

## Requirements Validated

- None — R021 requires end-to-end purchase flow verification (S06) to be fully validated.

## New Requirements Surfaced

- None

## Requirements Invalidated or Re-scoped

- None

## Deviations

None. All 4 tasks executed as planned. T04 was a verification-only pass because T03 proactively completed all i18n work during component creation.

## Known Limitations

- `programs_template_creating` i18n key exists in both locale files but is not currently referenced by any component (available for future loading text).
- Template names and descriptions are hardcoded English strings (matching free template pattern per D085). No localized template names.
- Premium gate is enforced locally — no server-side purchase validation (M004 scope per D071).

## Follow-ups

- S05 needs premium template feature descriptions for store listing metadata.
- S07 needs to verify the 9 `programs_template_*` keys are covered for all remaining locales (es, fr, it).

## Files Created/Modified

- `apps/mobile/src/lib/data/templates/types.ts` — Added `premium?: boolean` field to ProgramTemplate interface
- `apps/mobile/src/lib/data/templates/periodized-strength-531.ts` — New: 4-day, 7-week strength periodization template
- `apps/mobile/src/lib/data/templates/linear-progression-lp.ts` — New: 4-day, 6-week upper/lower linear progression template
- `apps/mobile/src/lib/data/templates/tiered-volume-method.ts` — New: 4-day, 6-week T1/T2/T3 tiered structure template
- `apps/mobile/src/lib/data/templates/periodized-hypertrophy.ts` — New: 5-day, 8-week hypertrophy-focused template
- `apps/mobile/src/lib/data/templates/strength-endurance-block.ts` — New: 3-day, 6-week DUP full body template
- `apps/mobile/src/lib/data/templates/index.ts` — Added all premium exports, PREMIUM_PROGRAM_TEMPLATES, ALL_TEMPLATES arrays
- `apps/mobile/src/lib/db/__tests__/template-service.test.ts` — Added 19 tests for premium template integrity and creation
- `apps/mobile/src/lib/components/programs/TemplateBrowserCard.svelte` — New: template card with lock/loading/premium badge
- `apps/mobile/src/lib/components/programs/TemplateBrowserDrawer.svelte` — New: drawer listing all templates with premium gate and PaywallDrawer integration
- `apps/mobile/src/routes/programs/+page.svelte` — Added "From Template" FAB and TemplateBrowserDrawer
- `apps/mobile/messages/de.json` — Added 9 template browser i18n keys (365 total)
- `apps/mobile/messages/en.json` — Added 9 template browser i18n keys (365 total)

## Forward Intelligence

### What the next slice should know
- ALL_TEMPLATES has 8 entries (3 free + 5 premium). S05 store listing can reference "8 program templates including 5 premium" in descriptions.
- Template names are English strings in data files — store listing descriptions should use the template names as-is.
- PaywallDrawer is now used from two surfaces: UpgradePrompt (S03) and TemplateBrowserDrawer (S04). S05 screenshots should capture both paths.

### What's fragile
- Template exercise names must exactly match SEED_EXERCISES — any seed data changes in future milestones require auditing all 8 templates. Test suite catches this automatically.

### Authoritative diagnostics
- `pnpm test` — template-service.test.ts validates all template data integrity. 44 tests in that file cover both free and premium templates.
- i18n key count: `jq 'keys | length' apps/mobile/messages/de.json` must equal `jq 'keys | length' apps/mobile/messages/en.json`

### What assumptions changed
- T04 was planned as a separate i18n task but T03 completed all i18n work inline — the separate task pattern may be unnecessary for small key sets (< 15 keys).

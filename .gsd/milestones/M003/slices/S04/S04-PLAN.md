# S04: Premium Program Templates

**Goal:** Users can browse 5 premium program templates alongside existing free templates on the Programs page, see premium indicators, and create programs from premium templates after purchasing the template pack.
**Demo:** On the Programs page, tapping "Create from Template" opens a Drawer listing 8 templates (3 free + 5 premium). Free templates create programs immediately. Premium templates show a lock icon; tapping one without the template pack opens the PaywallDrawer. After purchasing (or with dev override), premium templates create programs normally via `createProgramFromTemplate()`.

## Must-Haves

- 5 premium template data files with accurate periodization, all exercise names exactly matching SEED_EXERCISES
- `ProgramTemplate` type extended with optional `premium?: boolean` field (backwards compatible)
- Template registry exports both free and premium templates, plus a combined `ALL_TEMPLATES` list
- Template browsing Drawer accessible from Programs page via a secondary action (existing manual create flow untouched)
- Premium templates visually distinguished with lock icon and premium badge
- Premium gate enforced via `canAccessFeature(PremiumFeature.premium_templates)` before `createProgramFromTemplate()`
- Tapping a locked premium template opens PaywallDrawer; on purchase complete, user can immediately create from that template
- Premium templates do NOT appear in onboarding
- All premium template data passes existing integrity tests (exercise name resolution, rep ranges, uniqueness, mesocycle defaults)
- Test count increases (409+ baseline)
- New i18n keys added to de.json and en.json with zero drift

## Proof Level

- This slice proves: contract + integration (template data integrity via tests, UI gating via premium service, template creation via existing `createProgramFromTemplate()`)
- Real runtime required: no (template creation tested via existing test infrastructure; premium gate uses same `canAccessFeature()` infrastructure proven in S02)
- Human/UAT required: no (visual design can be verified in dev server, but correctness is covered by tests + code review)

## Verification

- `cd apps/mobile && pnpm test` — all tests pass, count >= 420 (409 baseline + new premium template tests)
- `pnpm run build` — zero errors
- Premium template integrity: all 5 templates included in `template-service.test.ts` data integrity group — exercise names, rep ranges, day counts, uniqueness, mesocycle defaults validated
- Premium template creation: at least one premium template tested via `createProgramFromTemplate()` in test suite
- i18n key count: `de.json` and `en.json` have identical key counts, new template keys present in both
- Onboarding: `PROGRAM_TEMPLATES` export still contains exactly 3 free templates (onboarding unchanged)

## Observability / Diagnostics

- Runtime signals: `[TemplateService]` prefixed logs already cover template creation flow. Premium gate logs via `[Premium] canAccessFeature(premium_templates)`. No additional logging needed — existing infrastructure covers all paths.
- Inspection surfaces: Dev override (`setPremiumStatus(true)`) enables premium template access for testing without native purchase flow. Template data integrity validated by test suite on every run.
- Failure visibility: `createProgramFromTemplate()` fails fast with all missing exercise names listed (D033). `canAccessFeature()` logs product check result with matched product IDs.
- Redaction constraints: None — no secrets or PII in template data or premium checks.

## Integration Closure

- Upstream surfaces consumed:
  - `src/lib/data/templates/types.ts` — `ProgramTemplate` interface (extended with `premium` field)
  - `src/lib/db/services/template-service.ts` — `createProgramFromTemplate()` (used as-is)
  - `src/lib/services/premium.ts` — `canAccessFeature(PremiumFeature.premium_templates)`, `isPremiumUser()`
  - `src/lib/components/premium/PaywallDrawer.svelte` — purchase flow for template pack
  - `src/lib/components/premium/UpgradePrompt.svelte` — feature="premium_templates" support
- New wiring introduced in this slice:
  - Template browsing Drawer on Programs page → template selection → premium gate check → PaywallDrawer (if locked) or `createProgramFromTemplate()` (if unlocked)
  - 5 premium template data files registered in template index
  - `ALL_TEMPLATES` combined export for template browsing UI
- What remains before the milestone is truly usable end-to-end:
  - S05: Store listing optimization (descriptions, screenshots, metadata)
  - S06: End-to-end integration testing on real devices, store submission
  - S07: Full i18n for all locales (S04 only covers de + en)

## Tasks

- [x] **T01: Author 5 premium template data files and extend type/registry** `est:1h30m`
  - Why: The core deliverable — 5 high-quality premium template data files following existing patterns, type extension with `premium` field, and registry updates. This is pure data + type work with no UI.
  - Files: `src/lib/data/templates/types.ts`, `src/lib/data/templates/periodized-strength-531.ts`, `src/lib/data/templates/linear-progression-lp.ts`, `src/lib/data/templates/tiered-volume-method.ts`, `src/lib/data/templates/periodized-hypertrophy.ts`, `src/lib/data/templates/strength-endurance-block.ts`, `src/lib/data/templates/index.ts`
  - Do: Add optional `premium?: boolean` to `ProgramTemplate` interface. Create 5 template files following `ppl.ts` pattern exactly, each with `premium: true`. Each template must use distinct training philosophy with exercise names copied verbatim from SEED_EXERCISES. Add named exports and `PREMIUM_PROGRAM_TEMPLATES` + `ALL_TEMPLATES` arrays to index. Existing `PROGRAM_TEMPLATES` unchanged (3 free templates).
  - Verify: `pnpm test` passes, `pnpm run build` succeeds. Manually verify exercise names match seed data.
  - Done when: 5 premium template files exist, all exercise names resolve, type is extended, registry exports both free-only and combined lists.

- [x] **T02: Extend template tests for premium templates** `est:30m`
  - Why: Premium templates must be validated by the same integrity checks as free templates — exercise name resolution, rep ranges, day counts, uniqueness, mesocycle defaults. Without this, typos in exercise names would cause runtime failures.
  - Files: `src/lib/db/__tests__/template-service.test.ts`
  - Do: Import `PREMIUM_PROGRAM_TEMPLATES` and `ALL_TEMPLATES`. Add parallel integrity test group for premium templates: exercise names in SEED_EXERCISES, valid rep ranges, no duplicate exercises per day, valid mesocycle defaults, unique IDs across ALL templates. Add `createProgramFromTemplate` test for one premium template. Update existing count assertion (3 → verify `PROGRAM_TEMPLATES` still has 3, `ALL_TEMPLATES` has 8).
  - Verify: `pnpm test` passes, test count >= 420.
  - Done when: All 5 premium templates pass data integrity tests, at least one premium template tested via `createProgramFromTemplate()`, existing free template tests unchanged.

- [x] **T03: Build template browsing Drawer on Programs page with premium gate** `est:1h30m`
  - Why: The user-facing UI — a Drawer for browsing and selecting templates, integrated into the Programs page alongside the existing manual create flow. Premium templates gated by `canAccessFeature()` with PaywallDrawer fallback.
  - Files: `src/lib/components/programs/TemplateBrowserDrawer.svelte`, `src/lib/components/programs/TemplateBrowserCard.svelte`, `src/routes/programs/+page.svelte`
  - Do: Create `TemplateBrowserCard.svelte` extending `TemplateCard` pattern with premium badge (Lock icon) and visual distinction for premium templates. Create `TemplateBrowserDrawer.svelte` that lists `ALL_TEMPLATES` with free/premium sections, checks `canAccessFeature(PremiumFeature.premium_templates)` on mount, gates premium template selection — opens PaywallDrawer if not purchased, calls `createProgramFromTemplate()` if purchased. Add "From Template" button alongside existing "Create Program" FAB on Programs page. Wire `onpurchasecomplete` callback to re-check premium status and allow immediate template selection.
  - Verify: `pnpm run build` succeeds. Dev server: template Drawer opens from Programs page, shows 8 templates with premium indicators, manual create flow still works.
  - Done when: Template browsing UI is functional, premium gate blocks unpurchased users, PaywallDrawer opens for locked templates, post-purchase re-check enables immediate creation.

- [x] **T04: Add i18n keys for template browsing UI (de + en)** `est:30m`
  - Why: All new UI text needs localization in base locale (de) and English. Template names and descriptions in template data files are hardcoded English (matching existing pattern), but UI chrome (section headers, buttons, badges, empty states) needs i18n keys.
  - Files: `apps/mobile/messages/de.json`, `apps/mobile/messages/en.json`, component files updated to use `m.*()` calls
  - Do: Add keys for: template browser drawer title/description, "From Template" button label, premium badge text, free section header, premium section header, template creation success toast, template creation loading state. Update `TemplateBrowserDrawer.svelte` and `TemplateBrowserCard.svelte` to use `m.*()` calls instead of hardcoded strings. Verify de.json and en.json key counts match.
  - Verify: `pnpm run build` succeeds. `jq 'keys | length' messages/de.json` equals `jq 'keys | length' messages/en.json`.
  - Done when: All template browsing UI strings use i18n, de.json and en.json have identical key counts, no hardcoded German or English strings in components.

## Files Likely Touched

- `src/lib/data/templates/types.ts`
- `src/lib/data/templates/periodized-strength-531.ts` (new)
- `src/lib/data/templates/linear-progression-lp.ts` (new)
- `src/lib/data/templates/tiered-volume-method.ts` (new)
- `src/lib/data/templates/periodized-hypertrophy.ts` (new)
- `src/lib/data/templates/strength-endurance-block.ts` (new)
- `src/lib/data/templates/index.ts`
- `src/lib/db/__tests__/template-service.test.ts`
- `src/lib/components/programs/TemplateBrowserDrawer.svelte` (new)
- `src/lib/components/programs/TemplateBrowserCard.svelte` (new)
- `src/routes/programs/+page.svelte`
- `apps/mobile/messages/de.json`
- `apps/mobile/messages/en.json`

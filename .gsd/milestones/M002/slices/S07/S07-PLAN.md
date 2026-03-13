# S07: i18n — German & English for Analytics UI

**Goal:** All M002 analytics UI text exists in both `de.json` (base) and `en.json` with zero key drift, and all date formatting respects the active locale.
**Demo:** Switch app language to English → all PR celebrations, PR history, progression banners, and deload banners display correct English text. Date axes on charts format as English dates. Switch back to German → everything shows German. No fallback-to-German visible in English mode.

## Must-Haves

- All 41 missing English translations added to `en.json` with correct parameter names matching `de.json`
- `de.json` and `en.json` have identical key sets (319 keys each, zero drift)
- 4 hardcoded `'de-DE'` locale strings replaced with locale-aware formatting using `getLocale()`
- `pnpm run build` succeeds with zero errors
- No hardcoded German locale strings remain in M002 components

## Proof Level

- This slice proves: integration (i18n keys compile and render in both locales; date formatting adapts to active locale)
- Real runtime required: no (build verification + key count diff suffices; runtime display is a human/UAT concern)
- Human/UAT required: yes (visual spot-check that English translations read naturally in context — cannot be automated)

## Verification

- `cd apps/mobile && diff <(jq -r 'keys[]' messages/de.json | sort) <(jq -r 'keys[]' messages/en.json | sort)` — must produce no output (zero key drift)
- `jq 'keys | length' apps/mobile/messages/de.json apps/mobile/messages/en.json` — both must report 319
- `grep -rn "'de-DE'" apps/mobile/src/lib/components/analytics/ apps/mobile/src/lib/components/history/PRHistoryCard.svelte` — must return no matches
- `cd apps/mobile && pnpm run build` — must succeed with zero errors

## Observability / Diagnostics

- Runtime signals: Paraglide compile errors surface as build failures if parameter names mismatch between locales. Missing keys cause fallback to `de.js` re-exports (German text appears in English mode).
- Inspection surfaces: `diff <(jq -r 'keys[]' messages/de.json | sort) <(jq -r 'keys[]' messages/en.json | sort)` — instant drift detection. `grep "'de-DE'" src/` — finds remaining hardcoded locales.
- Failure visibility: Build error output from `pnpm run build` identifies exact parameter mismatches. Paraglide compile step logs which keys are generated vs. re-exported.
- Redaction constraints: None — no secrets in i18n files.

## Integration Closure

- Upstream surfaces consumed: `apps/mobile/messages/de.json` (source of truth, 319 keys), all M002 `.svelte` components that use `m.*()` calls, `$lib/paraglide/runtime.js` (`getLocale()`)
- New wiring introduced in this slice: Locale-to-BCP47 mapping utility for `Intl.DateTimeFormat` calls; 41 new `en.json` entries enabling English locale for all M002 UI
- What remains before the milestone is truly usable end-to-end: Nothing — this is the final slice of M002. After S07, all milestone success criteria should be met.

## Tasks

- [x] **T01: Add 41 missing English translations to en.json** `est:25m`
  - Why: English users currently see German fallback text for PR celebrations, PR details, PR history, progression banners, and deload banners — a real user-facing bug. This task adds all 41 missing translations.
  - Files: `apps/mobile/messages/en.json`
  - Do: Add English translations for all 41 keys (4 deload_banner, 9 pr_celebration, 10 pr_detail, 13 pr_history, 5 progression_banner). Match parameter names exactly (`{value}`, `{count}`, `{week}`, `{date}`, `{weight}`, `{suggestedWeight}`, `{increment}`, `{avgRir}`, `{sessions}`). Translate contextually — check component usage for each key group to ensure translations make sense in context, not just as isolated strings.
  - Verify: `diff <(jq -r 'keys[]' messages/de.json | sort) <(jq -r 'keys[]' messages/en.json | sort)` produces empty output; both files report 319 keys; `pnpm run build` succeeds.
  - Done when: `en.json` has 319 keys matching `de.json` key-for-key, all with natural English translations and correct parameters.

- [x] **T02: Replace hardcoded 'de-DE' locale in M002 chart and PR components** `est:20m`
  - Why: 4 M002 components hardcode `'de-DE'` for date formatting, so chart axes and PR dates always display in German regardless of the user's language setting. This breaks the English locale experience.
  - Files: `apps/mobile/src/lib/components/analytics/StrengthChart.svelte`, `apps/mobile/src/lib/components/analytics/VolumeChart.svelte`, `apps/mobile/src/lib/components/analytics/BodyWeightChart.svelte`, `apps/mobile/src/lib/components/history/PRHistoryCard.svelte`
  - Do: Import `getLocale` from `$lib/paraglide/runtime.js` in each component. Create a locale-to-BCP47 mapping (inline or shared helper: `de` → `de-DE`, `en` → `en-US`). Replace each hardcoded `'de-DE'` with the mapped value from `getLocale()`. Keep the same `Intl.DateTimeFormat` options (month/day format, etc.).
  - Verify: `grep -rn "'de-DE'" apps/mobile/src/lib/components/analytics/ apps/mobile/src/lib/components/history/PRHistoryCard.svelte` returns no matches; `pnpm run build` succeeds with zero errors.
  - Done when: All 4 files use locale-aware date formatting and build passes cleanly.

## Files Likely Touched

- `apps/mobile/messages/en.json`
- `apps/mobile/src/lib/components/analytics/StrengthChart.svelte`
- `apps/mobile/src/lib/components/analytics/VolumeChart.svelte`
- `apps/mobile/src/lib/components/analytics/BodyWeightChart.svelte`
- `apps/mobile/src/lib/components/history/PRHistoryCard.svelte`

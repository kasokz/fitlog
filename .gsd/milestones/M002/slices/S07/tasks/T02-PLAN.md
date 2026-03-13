---
estimated_steps: 4
estimated_files: 4
---

# T02: Replace hardcoded 'de-DE' locale in M002 chart and PR components

**Slice:** S07 — i18n — German & English for Analytics UI
**Milestone:** M002

## Description

Four M002 components hardcode `'de-DE'` as the locale for `Intl.DateTimeFormat` and `toLocaleDateString()` calls. This means chart date axes and PR history dates always display in German format regardless of the user's active language setting. This task replaces all 4 instances with locale-aware formatting using paraglide's `getLocale()` mapped to BCP 47 locale tags.

## Steps

1. Check the existing `getLocale()` usage pattern in `apps/mobile/src/routes/settings/+page.svelte` to confirm the import path and return values (`"de"` / `"en"`).
2. In each of the 4 affected files, import `getLocale` from `$lib/paraglide/runtime.js` and replace the hardcoded `'de-DE'` string with a locale-aware expression. Map paraglide tags to BCP 47: `de` → `de-DE`, `en` → `en-US`. Use an inline mapping object or a shared helper — prefer the simplest approach that avoids duplication. If all 4 files need the same mapping, extract a small shared helper (e.g., `$lib/utils/locale.ts`).
3. Verify no `'de-DE'` strings remain in the 4 target files.
4. Run `pnpm run build` to confirm no regressions.

## Must-Haves

- [ ] `StrengthChart.svelte` line 58: `'de-DE'` replaced with locale-aware value
- [ ] `VolumeChart.svelte` line 60: `'de-DE'` replaced with locale-aware value
- [ ] `BodyWeightChart.svelte` line 65: `'de-DE'` replaced with locale-aware value
- [ ] `PRHistoryCard.svelte` line 24: `'de-DE'` replaced with locale-aware value
- [ ] All replacements use `getLocale()` from paraglide runtime, mapped to BCP 47
- [ ] `pnpm run build` succeeds with zero errors

## Verification

- `grep -rn "'de-DE'" apps/mobile/src/lib/components/analytics/ apps/mobile/src/lib/components/history/PRHistoryCard.svelte` — returns no matches
- `grep -rn "getLocale" apps/mobile/src/lib/components/analytics/StrengthChart.svelte apps/mobile/src/lib/components/analytics/VolumeChart.svelte apps/mobile/src/lib/components/analytics/BodyWeightChart.svelte apps/mobile/src/lib/components/history/PRHistoryCard.svelte` — returns matches in all 4 files (confirming import added)
- `cd apps/mobile && pnpm run build` — zero errors

## Observability Impact

- Signals added/changed: None — date formatting now follows active locale instead of being hardcoded
- How a future agent inspects this: `grep "'de-DE'" src/` across the codebase to find any remaining hardcoded locales (M001 components are known to have 3 but are out of scope for this slice)
- Failure state exposed: Build errors if import path is wrong; visually wrong date formats if BCP 47 mapping is incorrect (requires human spot-check)

## Inputs

- `apps/mobile/src/lib/components/analytics/StrengthChart.svelte:58` — hardcoded `'de-DE'` in `toLocaleDateString()`
- `apps/mobile/src/lib/components/analytics/VolumeChart.svelte:60` — hardcoded `'de-DE'` in `toLocaleDateString()`
- `apps/mobile/src/lib/components/analytics/BodyWeightChart.svelte:65` — hardcoded `'de-DE'` in `toLocaleDateString()`
- `apps/mobile/src/lib/components/history/PRHistoryCard.svelte:24` — hardcoded `'de-DE'` in `new Intl.DateTimeFormat()`
- `apps/mobile/src/routes/settings/+page.svelte` — existing `getLocale()` import pattern to follow

## Expected Output

- `apps/mobile/src/lib/components/analytics/StrengthChart.svelte` — locale-aware date formatting
- `apps/mobile/src/lib/components/analytics/VolumeChart.svelte` — locale-aware date formatting
- `apps/mobile/src/lib/components/analytics/BodyWeightChart.svelte` — locale-aware date formatting
- `apps/mobile/src/lib/components/history/PRHistoryCard.svelte` — locale-aware date formatting
- Optionally: `apps/mobile/src/lib/utils/locale.ts` — shared BCP 47 mapping helper (if extracted to avoid duplication)

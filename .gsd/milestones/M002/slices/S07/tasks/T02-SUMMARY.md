---
id: T02
parent: S07
milestone: M002
provides:
  - Locale-aware date formatting in all 4 M002 chart and PR components via shared getBcp47Locale() helper
key_files:
  - apps/mobile/src/lib/utils/locale.ts
  - apps/mobile/src/lib/components/analytics/StrengthChart.svelte
  - apps/mobile/src/lib/components/analytics/VolumeChart.svelte
  - apps/mobile/src/lib/components/analytics/BodyWeightChart.svelte
  - apps/mobile/src/lib/components/history/PRHistoryCard.svelte
key_decisions:
  - Extracted shared getBcp47Locale() helper in $lib/utils/locale.ts rather than inlining the mapping in each component — avoids 4x duplication and provides a single place to add new locales
patterns_established:
  - Use getBcp47Locale() from $lib/utils/locale.ts for all Intl API locale arguments instead of hardcoding BCP 47 tags
observability_surfaces:
  - "grep \"'de-DE'\" src/ — finds remaining hardcoded locales across the codebase"
duration: 5m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T02: Replace hardcoded 'de-DE' locale in M002 chart and PR components

**Created `getBcp47Locale()` shared helper and replaced all 4 hardcoded `'de-DE'` locale strings with locale-aware formatting.**

## What Happened

Created `apps/mobile/src/lib/utils/locale.ts` with a `getBcp47Locale()` function that reads the active paraglide locale via `getLocale()` and maps it to BCP 47 tags (`de` → `de-DE`, `en` → `en-US`). Updated all 4 target components to import and use this helper:

- `StrengthChart.svelte` line 59: `toLocaleDateString(getBcp47Locale(), ...)`
- `VolumeChart.svelte` line 61: `toLocaleDateString(getBcp47Locale(), ...)`
- `BodyWeightChart.svelte` line 66: `toLocaleDateString(getBcp47Locale(), ...)`
- `PRHistoryCard.svelte` line 25: `new Intl.DateTimeFormat(getBcp47Locale(), ...)`

## Verification

All checks passed:

- `grep -rn "'de-DE'" apps/mobile/src/lib/components/analytics/ apps/mobile/src/lib/components/history/PRHistoryCard.svelte` — **no matches** ✅
- `grep -rn "getBcp47Locale" ...` on all 4 files — **import and usage confirmed in all 4** ✅
- `cd apps/mobile && pnpm run build` — **zero errors** ✅

Slice-level checks (final task):
- `diff <(jq -r 'keys[]' messages/de.json | sort) <(jq -r 'keys[]' messages/en.json | sort)` — **empty output, zero key drift** ✅
- `jq 'keys | length' messages/de.json messages/en.json` — **both report 319** ✅

## Diagnostics

- `grep "'de-DE'" apps/mobile/src/` — finds any remaining hardcoded German locales (M001 components have 3 known instances, out of scope)
- Future locales: add new entries to `BCP47_MAP` in `apps/mobile/src/lib/utils/locale.ts`

## Deviations

Extracted a shared helper (`$lib/utils/locale.ts`) instead of using inline mappings — the plan listed this as optional, chosen to avoid 4x duplication.

## Known Issues

- 3 hardcoded `'de-DE'` instances remain in M001 components (out of scope for S07)

## Files Created/Modified

- `apps/mobile/src/lib/utils/locale.ts` — new shared BCP 47 locale mapping helper
- `apps/mobile/src/lib/components/analytics/StrengthChart.svelte` — replaced hardcoded `'de-DE'` with `getBcp47Locale()`
- `apps/mobile/src/lib/components/analytics/VolumeChart.svelte` — replaced hardcoded `'de-DE'` with `getBcp47Locale()`
- `apps/mobile/src/lib/components/analytics/BodyWeightChart.svelte` — replaced hardcoded `'de-DE'` with `getBcp47Locale()`
- `apps/mobile/src/lib/components/history/PRHistoryCard.svelte` — replaced hardcoded `'de-DE'` with `getBcp47Locale()`

---
estimated_steps: 4
estimated_files: 1
---

# T01: Add 41 missing English translations to en.json

**Slice:** S07 — i18n — German & English for Analytics UI
**Milestone:** M002

## Description

English users currently see German fallback text for all PR celebrations, PR detail sections, PR history views, progression suggestion banners, and deload banners. Paraglide re-exports German values when English keys are missing, making the English locale experience broken for all M002 analytics features. This task adds all 41 missing English translations to `en.json` with exact parameter name matching.

## Steps

1. Read `apps/mobile/messages/de.json` to get the exact values and parameter names for all 41 missing keys.
2. For each key group, check the component that uses the keys to understand context:
   - Deload banner keys → `DeloadBanner.svelte`
   - PR celebration keys → `PRCelebrationToast.svelte`
   - PR detail keys → `ExercisePRSection.svelte`
   - PR history keys → `PRHistoryCard.svelte` and PR history page
   - Progression banner keys → `ProgressionBanner.svelte`
3. Add all 41 English translations to `en.json` in alphabetical order (matching existing file structure), preserving exact parameter names (`{value}`, `{count}`, `{week}`, `{date}`, `{weight}`, `{suggestedWeight}`, `{increment}`, `{avgRir}`, `{sessions}`).
4. Verify key count parity: `jq 'keys | length'` must report 319 for both files; `diff` of sorted keys must be empty.

## Must-Haves

- [ ] All 41 keys from de.json present in en.json with English translations
- [ ] Parameter names match exactly between de.json and en.json for every key
- [ ] Key count: 319 in both files (zero drift)
- [ ] Translations are contextually appropriate (not literal word-for-word where idiom differs)
- [ ] `pnpm run build` succeeds

## Verification

- `cd apps/mobile && diff <(jq -r 'keys[]' messages/de.json | sort) <(jq -r 'keys[]' messages/en.json | sort)` — empty output
- `jq 'keys | length' apps/mobile/messages/de.json apps/mobile/messages/en.json` — both 319
- `cd apps/mobile && pnpm run build` — zero errors

## Observability Impact

- Signals added/changed: None — pure JSON addition, no runtime code changes
- How a future agent inspects this: `diff <(jq -r 'keys[]' messages/de.json | sort) <(jq -r 'keys[]' messages/en.json | sort)` for drift detection
- Failure state exposed: Paraglide compile errors surface parameter mismatches during build

## Inputs

- `apps/mobile/messages/de.json` — source of truth with all 319 keys including the 41 to translate
- `apps/mobile/messages/en.json` — current state with 278 keys, missing 41
- S07-RESEARCH.md key inventory table — lists all 41 keys with German values and parameters

## Expected Output

- `apps/mobile/messages/en.json` — updated from 278 to 319 keys with English translations for all deload_banner, pr_celebration, pr_detail, pr_history, and progression_banner keys

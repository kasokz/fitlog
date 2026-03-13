---
id: T01
parent: S07
milestone: M003
provides:
  - Formal i18n audit confirming zero drift across de.json and en.json
key_files:
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions: []
patterns_established: []
observability_surfaces:
  - none
duration: 5m
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T01: Run full i18n audit and verify build

**Full i18n audit passed — 365 keys in both locales, zero drift, zero parameter mismatches, no hardcoded strings in M003 components.**

## What Happened

Ran the complete five-step audit defined in the task plan:

1. **Key counts** — both de.json and en.json have exactly 365 keys.
2. **Key diff** — `diff` of sorted key lists produced no output (identical sets).
3. **Parameter parity** — Python script extracted `{param}` placeholders from all 365 keys in both locales; zero mismatches found.
4. **Hardcoded string scan** — grepped PaywallDrawer, TemplateBrowserDrawer, TemplateBrowserCard, UpgradePrompt, and settings/+page.svelte for user-facing strings not routed through `m.*()`. No hits.
5. **Unreferenced key check** — `programs_template_creating` confirmed as the only key present in locale files but not referenced in source (known spare from S04).
6. **Tests** — `pnpm test`: 17 test files, 428 tests, all passed.
7. **Build** — `pnpm run build`: succeeded, site written to `build/`.

No fixes were needed — all checks passed on first run.

## Verification

- `jq 'keys | length'` → de.json: 365, en.json: 365 ✅
- `diff <(jq -r 'keys[]' de.json | sort) <(jq -r 'keys[]' en.json | sort)` → no output ✅
- Parameter parity script → "All 365 keys have matching parameters" ✅
- Hardcoded string grep on M003 components → no hits ✅
- `programs_template_creating` confirmed as only unreferenced key (known spare) ✅
- `pnpm test` → 428 passed, 0 failed ✅
- `pnpm run build` → ✓ built, adapter-static wrote site ✅

## Slice-Level Verification Status

All 5 slice verification checks pass:
- [x] Key diff — no output (identical keys)
- [x] Parameter parity — zero mismatches
- [x] M003 component hardcoded string scan — clean
- [x] `pnpm test` — all tests pass
- [x] `pnpm run build` — zero errors

## Diagnostics

None — this task is audit-only with no runtime artifacts.

## Deviations

None.

## Known Issues

- `programs_template_creating` key exists in both locales but is not referenced in any source file. Known spare from S04, not a defect.

## Files Created/Modified

No source files modified — audit was read-only.

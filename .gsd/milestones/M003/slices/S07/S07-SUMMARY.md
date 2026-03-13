---
id: S07
parent: M003
milestone: M003
provides:
  - Formal i18n audit confirming zero key drift across de.json and en.json for all M003 keys
requires:
  - slice: S03
    provides: Paywall UI text (key names and German base text)
  - slice: S04
    provides: Template UI text (key names and German base text)
affects: []
key_files:
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions: []
patterns_established: []
observability_surfaces:
  - none
drill_down_paths:
  - .gsd/milestones/M003/slices/S07/tasks/T01-SUMMARY.md
duration: 10m
verification_result: passed
completed_at: 2026-03-13
---

# S07: i18n — New Keys for All Locales

**Full i18n audit passed — 365 keys in both de.json and en.json, zero drift, zero parameter mismatches, no hardcoded strings in M003 components.**

## What Happened

This slice was a formal verification pass. All M003 i18n keys were front-loaded into S01–S04 during implementation, so S07's job was confirming the invariant holds. Ran a five-step audit:

1. Key counts — both locales have exactly 365 keys.
2. Sorted key diff — no output (identical sets).
3. Parameter parity — Python script compared `{param}` placeholders across all 365 keys. Zero mismatches.
4. Hardcoded string scan — grepped PaywallDrawer, TemplateBrowserDrawer, TemplateBrowserCard, UpgradePrompt, and settings page for user-facing text not routed through `m.*()`. No hits.
5. Unreferenced key check — `programs_template_creating` confirmed as the only key not referenced in source (known spare from S04).

Tests (428 passed) and build both green. No fixes were needed.

## Verification

- `jq 'keys | length'` → de.json: 365, en.json: 365 ✅
- `diff` of sorted key lists → no output ✅
- Parameter parity script → "All 365 keys have matching parameters" ✅
- Hardcoded string grep on M003 components → no hits ✅
- `programs_template_creating` confirmed as only unreferenced key ✅
- `pnpm test` → 428 passed, 0 failed ✅
- `pnpm run build` → success ✅

## Requirements Advanced

- R010 (i18n Support de/en) — All M003 UI text localized in both languages with zero drift

## Requirements Validated

- none

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

None.

## Known Limitations

- `programs_template_creating` key exists in both locales but is unreferenced in source. Known spare from S04, not a defect.
- Template names and descriptions (D085) remain hardcoded English in data files — only UI chrome around them is i18n'd.

## Follow-ups

- none

## Files Created/Modified

No source files modified — audit was read-only.

## Forward Intelligence

### What the next slice should know
- i18n is clean — 365 keys, zero drift. Any new feature can add keys to both locales without worrying about existing debt.

### What's fragile
- Nothing — this was an audit slice with no implementation.

### Authoritative diagnostics
- `diff <(jq -r 'keys[]' de.json | sort) <(jq -r 'keys[]' en.json | sort)` in `apps/mobile/messages/` is the canonical zero-drift check.

### What assumptions changed
- Plan estimated ~40-60 new M003 keys. Actual M003 key additions across S01-S04 were integrated incrementally and all present at audit time. No remediation needed.

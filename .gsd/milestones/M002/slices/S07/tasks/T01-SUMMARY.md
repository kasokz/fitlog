---
id: T01
parent: S07
milestone: M002
provides:
  - All 41 missing English translations for M002 analytics UI features
key_files:
  - apps/mobile/messages/en.json
key_decisions: []
patterns_established: []
observability_surfaces:
  - "diff <(jq -r 'keys[]' messages/de.json | sort) <(jq -r 'keys[]' messages/en.json | sort) — empty = no drift"
  - "Paraglide compile errors surface parameter mismatches during build"
duration: ~5min
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Add 41 missing English translations to en.json

**Added 41 English translations for deload banners, PR celebrations, PR details, PR history, and progression banners — en.json now has full 319-key parity with de.json.**

## What Happened

Read all 41 missing keys from de.json and their component usage contexts (DeloadBanner, PRCelebrationToast, ExercisePRSection, PRHistoryCard, ProgressionBanner, PR history page) to produce contextually appropriate English translations. Added all 41 keys to en.json in alphabetical order with exact parameter name matching. Key count went from 278 → 319, matching de.json exactly.

## Verification

- `diff <(jq -r 'keys[]' messages/de.json | sort) <(jq -r 'keys[]' messages/en.json | sort)` — empty output ✅
- `jq 'keys | length'` — both files report 319 ✅
- Parameter name validation script — all parameters match exactly between de.json and en.json ✅
- `pnpm run build` — succeeds with zero errors ✅

Slice-level checks (partial — T01 is intermediate):
- Key drift check: ✅ passes
- Key count parity (319/319): ✅ passes
- Hardcoded `'de-DE'` locale check: ❌ expected — 4 matches remain (T02 scope)
- Build: ✅ passes

## Diagnostics

Run `diff <(jq -r 'keys[]' messages/de.json | sort) <(jq -r 'keys[]' messages/en.json | sort)` to detect future key drift. Paraglide compile step will fail the build if parameter names mismatch.

## Deviations

None.

## Known Issues

- 2 keys (`pr_history_current_best`, `progression_banner_sessions_analyzed`) exist in de.json and now en.json but are not yet referenced in any component — translated anyway for parity.

## Files Created/Modified

- `apps/mobile/messages/en.json` — Added 41 English translations (278 → 319 keys)

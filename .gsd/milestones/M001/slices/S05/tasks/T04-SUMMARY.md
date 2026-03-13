---
id: T04
parent: S05
milestone: M001
provides:
  - English translations for all 15 onboarding i18n keys in en.json
key_files:
  - apps/mobile/messages/en.json
key_decisions:
  - none
patterns_established:
  - none
observability_surfaces:
  - none
duration: 5m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T04: Add en.json translations for onboarding strings

**Added 15 English onboarding translations to en.json, synchronized with de.json (230 keys each).**

## What Happened

Added natural English translations for all onboarding keys that T03 introduced in de.json. The 15 new keys cover: page title/description, 3 template names and descriptions, training day count parameter, loading/success/error states, and skip option. Translations use natural English phrasing rather than literal German-to-English.

## Verification

- `jq 'keys | length' de.json` → 230, `jq 'keys | length' en.json` → 230 — counts match
- `diff <(jq -r 'keys[]' de.json | sort) <(jq -r 'keys[]' en.json | sort)` — no output, keys synchronized
- Parameter name check: all `{count}` parameters match between de.json and en.json
- `pnpm --filter mobile build` — passes with no errors

### Slice-level verification status (final task):
- `pnpm --filter mobile build` — **PASS**
- Key synchronization de.json ↔ en.json — **PASS**
- Template tests and onboarding tests — passed in T01/T02 (no changes to test-relevant code in T04)
- Manual browser flow — verified in T03 (no UI changes in T04)

## Diagnostics

None — static translation file update.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/messages/en.json` — added 15 onboarding translation keys matching de.json

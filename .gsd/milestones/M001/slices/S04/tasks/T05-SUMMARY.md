---
id: T05
parent: S04
milestone: M001
provides:
  - Navigation card grid on main page linking to /programs, /exercises, /history, /bodyweight
  - English translations for all history_*, bodyweight_*, and nav_* i18n keys
key_files:
  - apps/mobile/src/routes/+page.svelte
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - Navigation uses 2x2 card grid with lucide icons and goto() rather than anchor links — consistent with existing app navigation pattern (goto used throughout)
patterns_established:
  - Main page navigation card pattern: Card with centered icon + label, onclick triggers goto()
observability_surfaces:
  - none — static navigation, no runtime signals
duration: 10m
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T05: Wire navigation links and add English translations

**Added navigation card grid to main page and English translations for all S04 i18n keys (history_*, bodyweight_*, nav_*)**

## What Happened

Updated the main page (`/`) from a simple title/description to a 2x2 navigation card grid linking to Programs, Exercises, History, and Body Weight. Each card uses a lucide icon and i18n label. Added 4 `nav_*` keys to de.json. Added all missing keys to en.json: 15 `history_*`, 21 `bodyweight_*`, and 4 `nav_*` keys with proper English translations. All parameter names ({count}, {minutes}, {number}) match between locales.

## Verification

- **Key parity check**: `history_`: de=15 en=15 | `bodyweight_`: de=21 en=21 | `nav_`: de=4 en=4
- **Parameter consistency**: Verified {count}, {minutes}, {number} match across de/en for parameterized keys
- **Build**: `pnpm --filter mobile build` — succeeded with no errors
- **Slice tests**: `pnpm --filter mobile test` — all 180 tests pass (5 test files)
- **All slice-level verification checks pass** (this is the final task of S04)

## Diagnostics

None — this task adds static navigation and i18n keys. Missing i18n keys cause build-time errors via paraglide.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/routes/+page.svelte` — Replaced minimal title page with 2x2 navigation card grid (Programs, Exercises, History, Body Weight)
- `apps/mobile/messages/de.json` — Added 4 nav_* keys (nav_history, nav_bodyweight, nav_exercises, nav_programs)
- `apps/mobile/messages/en.json` — Added 40 keys: 15 history_*, 21 bodyweight_*, 4 nav_* with English translations

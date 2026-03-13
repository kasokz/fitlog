---
estimated_steps: 4
estimated_files: 3
---

# T05: Wire navigation links and add English translations

**Slice:** S04 — Workout History & Body Weight
**Milestone:** M001

## Description

Make the new routes reachable from the main page by adding navigation cards, and add English translations for all new i18n keys to maintain locale parity. This closes the integration loop — history and body weight are discoverable and the app supports both locales.

## Steps

1. Update `src/routes/+page.svelte` to add navigation cards/links:
   - Add a card/button linking to `/history` (with History icon from lucide, title from i18n)
   - Add a card/button linking to `/bodyweight` (with Scale icon from lucide, title from i18n)
   - Add navigation i18n keys to de.json: `nav_history` ("Trainingsverlauf"), `nav_bodyweight` ("Körpergewicht"), `nav_exercises` ("Übungen"), `nav_programs` ("Programme")
   - Style as a simple card grid below the existing title/description

2. Add matching navigation i18n keys to en.json: `nav_history` ("Workout History"), `nav_bodyweight` ("Body Weight"), `nav_exercises` ("Exercises"), `nav_programs` ("Programs")

3. Add all `history_*` keys from de.json to en.json with proper English translations:
   - Translate each key maintaining the same parameters (e.g., {count}, {minutes}, {number})
   - Examples: "Trainingsverlauf" → "Workout History", "Noch keine Trainings" → "No Workouts Yet", "Trainingsdetails" → "Workout Details"

4. Add all `bodyweight_*` keys from de.json to en.json with proper English translations:
   - Translate each key maintaining the same parameters
   - Examples: "Körpergewicht" → "Body Weight", "Gewicht erfassen" → "Log Weight", "Eintrag löschen?" → "Delete Entry?"
   - Verify key parity: same count of history_* and bodyweight_* keys in both locale files

## Must-Haves

- [ ] Main page has navigation links to /history and /bodyweight
- [ ] All new history_* keys exist in en.json with English translations
- [ ] All new bodyweight_* keys exist in en.json with English translations
- [ ] All new nav_* keys exist in both de.json and en.json
- [ ] Parameter names ({count}, {minutes}, {number}) match between locales
- [ ] Build succeeds with all translations

## Verification

- `pnpm --filter mobile build` — build succeeds
- Key parity check: `for prefix in history_ bodyweight_ nav_; do echo "$prefix:"; de=$(jq -r 'keys[]' apps/mobile/messages/de.json | grep "^$prefix" | wc -l); en=$(jq -r 'keys[]' apps/mobile/messages/en.json | grep "^$prefix" | wc -l); echo "  de=$de en=$en"; done` — counts match for each prefix

## Observability Impact

- Signals added/changed: None
- How a future agent inspects this: Check de.json and en.json key counts, navigate to / to see nav links
- Failure state exposed: None — missing i18n keys cause build-time errors via paraglide

## Inputs

- `src/routes/+page.svelte` — current main page (minimal, just title/description)
- `apps/mobile/messages/de.json` — de keys with all history_* and bodyweight_* keys (from T03 and T04)
- `apps/mobile/messages/en.json` — existing English translations (need new keys added)

## Expected Output

- `src/routes/+page.svelte` — updated with navigation cards to /history, /bodyweight, /exercises, /programs
- `apps/mobile/messages/de.json` — nav_* keys added
- `apps/mobile/messages/en.json` — all new keys (history_*, bodyweight_*, nav_*) with English translations

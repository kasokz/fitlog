---
estimated_steps: 2
estimated_files: 1
---

# T05: i18n — English (en.json) translations for workout keys

**Slice:** S03 — Workout Logging
**Milestone:** M001

## Description

Translate all workout-related i18n keys from `de.json` (base locale) to English in `en.json`. Dedicated task per AGENTS.md convention to keep context focused on a single locale.

## Steps

1. **Extract new workout keys from de.json** — Read de.json, identify all keys with `workout_` prefix plus any new keys added for the "Start Workout" button on program detail. These are the keys that need English translations.

2. **Add English translations to en.json** — Translate each German key to natural English. Maintain exact same key names and parameter names (e.g. `{current}/{total}`). Verify all non-workout keys are still in sync (no missing/extra keys between de.json and en.json).

## Must-Haves

- [ ] All workout_ keys from de.json have corresponding entries in en.json
- [ ] Parameter names match exactly between locales
- [ ] Translations are natural English (not literal word-for-word German translations)
- [ ] Key parity: de.json and en.json have the exact same set of keys
- [ ] No existing translations modified

## Verification

- `cd apps/mobile/messages && diff <(jq -r 'keys[]' de.json | sort) <(jq -r 'keys[]' en.json | sort)` — no differences (key parity)
- `pnpm -F mobile build` — builds without errors

## Observability Impact

- Signals added/changed: None
- How a future agent inspects this: Compare key counts between locale files
- Failure state exposed: None

## Inputs

- `apps/mobile/messages/de.json` — source of truth with all workout_ keys (T04)
- `apps/mobile/messages/en.json` — existing English translations to extend

## Expected Output

- `apps/mobile/messages/en.json` — extended with all workout_ English translations, maintaining full key parity with de.json

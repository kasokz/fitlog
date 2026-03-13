---
estimated_steps: 2
estimated_files: 1
---

# T04: Add en.json translations for onboarding strings

**Slice:** S05 — Onboarding & Program Templates
**Milestone:** M001

## Description

Adds English translations for all onboarding keys added to de.json in T03. This is a parallel-safe i18n task — it only modifies en.json and uses de.json as the source of truth for key names and parameter patterns.

## Steps

1. **Add English translations to en.json** — For every new key added to de.json in T03, add the corresponding English translation to en.json. Ensure all parameter names match exactly (e.g., `{count}` in `onboarding_template_days_count`). Use natural English phrasing, not literal German translations.

2. **Verify key synchronization** — Run key count comparison: `jq 'keys | length' de.json` must equal `jq 'keys | length' en.json`. Run key diff to confirm no missing or extra keys.

## Must-Haves

- [ ] All onboarding keys from de.json have corresponding en.json entries
- [ ] Parameter names match exactly between de.json and en.json
- [ ] Key counts match between de.json and en.json
- [ ] Translations are natural English, not literal German-to-English

## Verification

- `cd apps/mobile/messages && jq 'keys | length' de.json` equals `jq 'keys | length' en.json`
- `diff <(jq -r 'keys[]' de.json | sort) <(jq -r 'keys[]' en.json | sort)` — no output (keys match)

## Observability Impact

- None — static translation file update.

## Inputs

- `apps/mobile/messages/de.json` — source of truth with new onboarding keys from T03
- `apps/mobile/messages/en.json` — existing English translations to extend

## Expected Output

- `apps/mobile/messages/en.json` — extended with all onboarding English translations, key count matching de.json

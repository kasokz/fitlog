# S07: i18n — New Keys for All Locales — UAT

**Milestone:** M003
**Written:** 2026-03-13

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This slice is a verification audit — no runtime behavior to test. Success is defined by static analysis of locale JSON files and build/test pass.

## Preconditions

- `apps/mobile/messages/de.json` and `apps/mobile/messages/en.json` exist
- `pnpm install` completed
- No pending i18n changes from other slices

## Smoke Test

Run `diff <(jq -r 'keys[]' apps/mobile/messages/de.json | sort) <(jq -r 'keys[]' apps/mobile/messages/en.json | sort)` — must produce no output.

## Test Cases

### 1. Key count parity

1. Run `jq 'keys | length' apps/mobile/messages/de.json`
2. Run `jq 'keys | length' apps/mobile/messages/en.json`
3. **Expected:** Both return the same number (365 at time of audit)

### 2. Zero key drift

1. Run `diff <(jq -r 'keys[]' de.json | sort) <(jq -r 'keys[]' en.json | sort)` from `apps/mobile/messages/`
2. **Expected:** No output (empty diff)

### 3. Parameter placeholder parity

1. For each key, extract `{param}` placeholders from de.json value and en.json value
2. **Expected:** Identical placeholder sets per key across both locales

### 4. No hardcoded strings in M003 components

1. Grep PaywallDrawer, TemplateBrowserDrawer, TemplateBrowserCard, UpgradePrompt, and settings page for user-facing text literals not wrapped in `m.*()`
2. **Expected:** No matches

### 5. Build and test pass

1. Run `pnpm test`
2. Run `pnpm run build`
3. **Expected:** All tests pass, build succeeds with zero errors

## Edge Cases

### Unreferenced keys

1. Check for keys present in locale files but not referenced in any source file
2. **Expected:** Only `programs_template_creating` (known spare from S04) is unreferenced

## Failure Signals

- `diff` of sorted keys produces output → key drift exists
- Parameter parity check shows mismatches → placeholder naming inconsistency
- Hardcoded string grep finds matches → missing i18n wrapping
- `pnpm test` or `pnpm run build` fails → broken locale integration

## Requirements Proved By This UAT

- R010 (i18n Support de/en) — All M003 UI text is localized in both de and en with zero drift

## Not Proven By This UAT

- Runtime locale switching behavior (covered by M001/S07 UAT)
- Translation quality / semantic accuracy (requires human review)
- Locales beyond de/en (only two locales in scope)

## Notes for Tester

This is an audit slice — all checks are automated scripts. No device or browser testing needed. The parameter parity check is best done with a script (Python or jq) rather than manual inspection of 365 keys.

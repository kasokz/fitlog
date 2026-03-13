# S07: i18n — New Keys for All Locales

**Goal:** All 46 M003 i18n keys verified present in both de.json and en.json with zero key drift, matching parameters, and no hardcoded strings in M003 components.
**Demo:** Audit script confirms identical key sets, parameter parity, and no unreferenced M003 keys. `pnpm test` and `pnpm run build` pass.

## Must-Haves

- de.json and en.json have identical key sets (zero drift)
- All `{param}` placeholder names match between locales for every key
- All M003 component strings go through `m.*()` — no hardcoded user-facing text
- `pnpm test` passes
- `pnpm run build` succeeds

## Verification

- `cd apps/mobile/messages && jq -r 'keys[]' de.json | sort > /tmp/de_keys.txt && jq -r 'keys[]' en.json | sort > /tmp/en_keys.txt && diff /tmp/de_keys.txt /tmp/en_keys.txt` — no output (identical keys)
- Parameter parity check: extract `{param}` from all values in both files, compare per-key
- Grep M003 components (PaywallDrawer, TemplateBrowserDrawer, TemplateBrowserCard, UpgradePrompt, settings page IAP/subscription sections) for hardcoded German/English strings not going through `m.*()`
- `pnpm test` — all tests pass
- `pnpm run build` — zero errors

## Tasks

- [x] **T01: Run full i18n audit and verify build** `est:20m`
  - Why: S07's deliverable is formal verification that M003 i18n is complete. All keys were front-loaded into S01-S04 — this task confirms the invariant and documents the audit trail.
  - Files: `apps/mobile/messages/de.json`, `apps/mobile/messages/en.json`, M003 component files (read-only)
  - Do: (1) Verify key counts match between de.json and en.json. (2) Diff sorted key lists — must produce no output. (3) Extract and compare `{param}` placeholders per key across both locales. (4) Scan M003 components for hardcoded user-facing strings not using `m.*()`. (5) Verify `programs_template_creating` is the only unreferenced key (known spare per S04). (6) Run `pnpm test` and `pnpm run build`. (7) If any issue found, fix it and re-verify.
  - Verify: `diff` of sorted keys is empty, parameter check passes, no hardcoded strings found, test+build green
  - Done when: Zero key drift confirmed, parameter parity confirmed, no hardcoded M003 strings, test+build pass

## Files Likely Touched

- `apps/mobile/messages/de.json` (read-only unless fixes needed)
- `apps/mobile/messages/en.json` (read-only unless fixes needed)

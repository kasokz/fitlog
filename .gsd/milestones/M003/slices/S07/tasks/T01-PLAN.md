---
estimated_steps: 5
estimated_files: 2
---

# T01: Run full i18n audit and verify build

**Slice:** S07 — i18n — New Keys for All Locales
**Milestone:** M003

## Description

Formal verification that all M003 i18n keys exist in both de.json and en.json with zero drift. Research confirmed 46 keys were added across S01-S04 and both locale files sit at 365 keys. This task runs the full audit to document the result, catches any regressions, and confirms build+test still pass.

## Steps

1. Compare key counts: `jq 'keys | length'` on both locale files — must be equal
2. Diff sorted key lists: extract keys, sort, diff — must produce no output
3. Parameter parity: for each key, extract `{param}` names from both de and en values, flag any mismatches
4. Scan M003 components for hardcoded user-facing strings not routed through `m.*()`:
   - `PaywallDrawer.svelte`
   - `TemplateBrowserDrawer.svelte`
   - `TemplateBrowserCard.svelte`
   - `UpgradePrompt.svelte`
   - `settings/+page.svelte` (IAP and subscription sections)
5. Run `pnpm test` and `pnpm run build` — both must pass. If any issue found in steps 1-4, fix and re-verify.

## Must-Haves

- [ ] de.json and en.json have identical key sets
- [ ] All `{param}` placeholder names match between locales
- [ ] No hardcoded user-facing strings in M003 components
- [ ] `pnpm test` passes
- [ ] `pnpm run build` succeeds

## Verification

- `diff <(jq -r 'keys[]' de.json | sort) <(jq -r 'keys[]' en.json | sort)` produces no output
- Parameter extraction script finds zero mismatches
- `grep` scan of M003 components finds no unlocalized strings
- `pnpm test` exits 0
- `pnpm run build` exits 0

## Inputs

- `apps/mobile/messages/de.json` — 365 keys (base locale, source of truth)
- `apps/mobile/messages/en.json` — 365 keys (must match de.json key set exactly)
- S07-RESEARCH.md — key inventory of all 46 M003 additions with parameter names

## Expected Output

- Audit results confirming zero drift, parameter parity, no hardcoded strings
- Green `pnpm test` and `pnpm run build`
- If fixes were needed: updated `de.json` and/or `en.json`

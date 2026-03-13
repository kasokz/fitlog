---
estimated_steps: 5
estimated_files: 3
---

# T04: Final i18n audit and build verification

**Slice:** S07 — i18n & Launch Readiness
**Milestone:** M001

## Description

Final sweep to catch any remaining un-i18n'd strings, verify all translation values are non-empty and semantically correct, confirm the full build pipeline works with the new Paraglide config, and run all slice verification commands. This is the terminal task — after it passes, S07 and M001 are complete.

## Steps

1. Run a comprehensive grep across all `.svelte` files for hardcoded user-facing text patterns: quoted strings in template blocks (outside `{...}` expressions), `placeholder="..."`, `title="..."`, and `aria-label="..."` attributes with literal English or German text. Exclude known non-i18n patterns (CSS classes, import paths, type annotations, prop names).
2. Verify all message values are non-empty in both locales: `jq 'to_entries | map(select(.value == "")) | length' messages/de.json` and same for en.json — both must return 0.
3. Spot-check en.json translation quality: read through the English translations to catch any that are just German text, machine-translation artifacts, or semantically wrong.
4. Run the full build: `cd apps/mobile && pnpm build`. This exercises the SvelteKit build + Paraglide compilation + all imports. Must exit 0.
5. Run every slice-level verification command listed in S07-PLAN.md and confirm all pass. Fix any that don't.

## Must-Haves

- [ ] No remaining hardcoded user-facing strings in .svelte files (beyond non-user-facing technical attributes)
- [ ] No empty values in de.json or en.json
- [ ] en.json translations are semantically correct English
- [ ] `pnpm build` succeeds
- [ ] All slice-level verification commands pass

## Verification

- `cd apps/mobile && pnpm build` exits 0
- `cd apps/mobile && pnpm paraglide:compile` exits 0
- `diff <(jq -r 'keys[]' messages/de.json | sort) <(jq -r 'keys[]' messages/en.json | sort)` — no output
- `jq 'to_entries | map(select(.value == "")) | length' messages/de.json` returns 0
- `jq 'to_entries | map(select(.value == "")) | length' messages/en.json` returns 0
- `grep -c "Schliessen\|Gesäss" messages/de.json` returns 0
- `grep -c '"Meine App"\|"My App"' messages/de.json messages/en.json` returns 0
- `grep '"baseLocale": "de"' project.inlang/settings.json` matches

## Observability Impact

- Signals added/changed: None — this is an audit and verification task
- How a future agent inspects this: Run the same verification commands listed above; check `pnpm build` output for warnings
- Failure state exposed: Build failures surface Paraglide compilation errors or Svelte component errors with specific file/line references

## Inputs

- All files modified in T01, T02, T03 — need to be in their final state
- `apps/mobile/messages/de.json` — complete key set (242 keys expected)
- `apps/mobile/messages/en.json` — complete key set (242 keys expected)
- S07-PLAN.md verification section — list of all verification commands

## Expected Output

- All verification commands pass (documented in task summary)
- `pnpm build` succeeds
- If any fixes were needed, the relevant de.json/en.json/component files are updated
- Confidence that i18n coverage is complete for M001

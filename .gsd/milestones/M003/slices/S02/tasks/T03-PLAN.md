---
estimated_steps: 4
estimated_files: 6
---

# T03: Verify backward compatibility and full-slice integration

**Slice:** S02 — Purchase State Management & Premium Gate Wiring
**Milestone:** M003

## Description

Final verification task ensuring all 4 existing consumers of the premium service work without modification, the full test suite passes, build is clean, and i18n keys are synchronized. This is the integration gate — if any consumer call site broke or any type mismatch surfaced, fix it here with the minimal change needed.

## Steps

1. **Run full test suite**: Execute `pnpm --filter mobile test -- --run` and confirm all suites pass (premium tests from T01, purchase-plugin tests from S01, all other existing test files). If any test fails, diagnose and fix the root cause in the relevant file.

2. **Run build and verify type safety**: Execute `pnpm --filter mobile build`. If TypeScript reports type errors in any consumer file (analytics, PR history, workout, settings), fix with the minimal change. Expected: no changes needed since `isPremiumUser()` and `canAccessFeature()` signatures are unchanged.

3. **Verify consumer code unchanged**: Run `rg 'isPremiumUser|canAccessFeature|setPremiumStatus' apps/mobile/src/routes/` and confirm all 4 consumer files use the same call patterns as before T01. Specifically verify:
   - `analytics/+page.svelte` — `isPremiumUser()` in `initDashboard()`
   - `prs/+page.svelte` — `isPremiumUser()` in `loadPRHistory()`
   - `workout/[sessionId]/+page.svelte` — `isPremiumUser()` gates progression loading
   - `settings/+page.svelte` — `isPremiumUser()` + `setPremiumStatus()` for dev toggle

4. **Verify i18n parity**: Run key count check across de.json and en.json. Confirm the new `premium_upgrade_description_premium_templates` key exists in both. Confirm zero drift.

## Must-Haves

- [ ] `pnpm --filter mobile test -- --run` — all suites pass
- [ ] `pnpm --filter mobile build` — succeeds with no type errors
- [ ] All 4 consumer files use identical premium service call patterns as pre-S02
- [ ] i18n key count parity: de.json == en.json
- [ ] Settings dev toggle (`setPremiumStatus`) still works as before

## Verification

- `pnpm --filter mobile test -- --run` — 0 failures
- `pnpm --filter mobile build` — exit 0
- `rg 'isPremiumUser|canAccessFeature|setPremiumStatus' apps/mobile/src/routes/` — output matches pre-S02 patterns (no new imports, no signature changes)
- `jq 'keys | length' apps/mobile/messages/de.json` == `jq 'keys | length' apps/mobile/messages/en.json`
- `jq '.premium_upgrade_description_premium_templates' apps/mobile/messages/de.json` — non-null
- `jq '.premium_upgrade_description_premium_templates' apps/mobile/messages/en.json` — non-null

## Observability Impact

- Signals added/changed: None — this is a verification-only task
- How a future agent inspects this: Run the same commands listed in Verification
- Failure state exposed: None

## Inputs

- All files modified in T01 and T02
- All 4 consumer route files (analytics, prs, workout, settings)
- de.json, en.json

## Expected Output

- No new files created. Possibly minimal fixes to consumer files if type issues surface (expected: none needed).
- Confirmed passing test suite and build as the slice completion gate.

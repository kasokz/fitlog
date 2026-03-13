# S05: i18n — German (base) + English — UAT

**Milestone:** M004
**Written:** 2026-03-13

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This slice is verification-only — no runtime UI was built. All checks are against static JSON files and source code via an automated script. The verification script IS the test.

## Preconditions

- Repository cloned with all dependencies installed (`pnpm install`)
- `jq` available on the system (used by the verification script)
- Both `apps/mobile/messages/de.json` and `apps/mobile/messages/en.json` exist

## Smoke Test

Run `bash scripts/verify-i18n-m004.sh` — should exit 0 with "6 passed, 0 failed" summary.

## Test Cases

### 1. Key count equality between locale files

1. Run: `jq 'keys | length' apps/mobile/messages/de.json`
2. Run: `jq 'keys | length' apps/mobile/messages/en.json`
3. **Expected:** Both return the same number (410 at time of writing)

### 2. Zero key drift (no missing or extra keys)

1. Run: `diff <(jq -r 'keys[]' apps/mobile/messages/de.json | sort) <(jq -r 'keys[]' apps/mobile/messages/en.json | sort)`
2. **Expected:** No output (empty diff = identical key sets)

### 3. All 28 auth keys present

1. Check `de.json` for keys matching `auth_*` pattern (e.g., `auth_sign_in_title`, `auth_sign_up_title`, `auth_sign_out`, `auth_email_label`, `auth_password_label`, `auth_error_invalid_credentials`, etc.)
2. Check `en.json` for the same keys
3. **Expected:** All 28 `auth_*` keys exist in both files with non-empty values

### 4. All 11 sync status keys present

1. Check both locale files for keys matching `sync_status_*` (e.g., `sync_status_title`, `sync_status_syncing`, `sync_status_last_synced`, `sync_status_never_synced`, `sync_status_error`, `sync_status_sync_now`, etc.)
2. **Expected:** All 11 `sync_status_*` keys exist in both files with non-empty values

### 5. All 6 export keys present

1. Check both locale files for keys matching `export_*` (e.g., `export_title`, `export_csv`, `export_json`, `export_success`, `export_error`, `export_no_data`)
2. **Expected:** All 6 `export_*` keys exist in both files with non-empty values

### 6. Parameter consistency across locales

1. For every key in `de.json`, extract `{param}` patterns
2. For the same key in `en.json`, extract `{param}` patterns
3. Compare the parameter sets
4. **Expected:** Identical parameter names for every key. E.g., if `de.json` has `sync_status_last_synced: "Zuletzt synchronisiert: {time}"`, then `en.json` must also use `{time}`, not `{timestamp}` or `{date}`

### 7. German Umlaut correctness

1. Scan all values in `de.json` for improper ASCII substitutes: `ae`, `oe`, `ue` where Umlaute should be used
2. **Expected:** No violations. German text uses `ä`, `ö`, `ü` — not `ae`, `oe`, `ue`

### 8. No hardcoded strings in M004 Svelte files

1. Check auth-related `.svelte` files (sign-in, sign-up screens)
2. Check sync status `.svelte` files
3. Check export `.svelte` files
4. Check account settings `.svelte` files
5. **Expected:** All user-facing strings use `m.*()` function calls, no hardcoded German or English text in HTML templates

### 9. Full test suites pass

1. Run: `pnpm --filter mobile test`
2. Run: `pnpm --filter web test`
3. **Expected:** 524 mobile tests pass, 26 web tests pass

### 10. Both apps build successfully

1. Run: `pnpm --filter mobile build`
2. Run: `pnpm --filter web build`
3. **Expected:** Both complete without errors

## Edge Cases

### Verification script failure output on deliberate breakage

1. Temporarily remove one M004 key from `en.json` (e.g., delete `auth_sign_in_title`)
2. Run: `bash scripts/verify-i18n-m004.sh`
3. **Expected:** Script exits non-zero, prints `✗ FAIL` with the specific missing key name
4. Restore `en.json` to original state

### Parameter mismatch detection

1. Temporarily change a parameter in `en.json` (e.g., rename `{time}` to `{timestamp}` in one key)
2. Run: `bash scripts/verify-i18n-m004.sh`
3. **Expected:** Script exits non-zero, reports the specific key with mismatched parameters
4. Restore `en.json` to original state

## Failure Signals

- `scripts/verify-i18n-m004.sh` exits non-zero — indicates key drift, missing keys, parameter mismatch, or hardcoded strings
- Test failures in mobile or web test suites — indicates i18n changes broke existing functionality
- Build failures — indicates import/reference errors in locale usage

## Requirements Proved By This UAT

- R010 (i18n Support de/en) — M004 scope: all auth, sync, export, and account settings UI strings are localized in both German and English

## Not Proven By This UAT

- Runtime rendering of translated strings (would require live-runtime UAT with language switching)
- Correctness of translations beyond parameter consistency (semantic quality is a human judgment)
- i18n for non-M004 features (covered by M001/M002/M003 verification)

## Notes for Tester

- The verification script is the primary UAT tool — run it first. If it passes, the slice is complete.
- Edge case tests (deliberate breakage) are optional — they verify the script itself works correctly on failure paths. Only run if you want to validate the diagnostic tooling.
- No UI changes were made in this slice, so there is nothing to visually inspect.

# S05: i18n — German (base) + English — Research

**Date:** 2026-03-13

## Summary

S05 is a verification and cleanup slice. S01–S04 proactively added all M004 i18n keys during implementation — 45 M004-specific keys across `auth_*` (28), `sync_status_*` (11), and `export_*` (6) prefixes exist in both `de.json` and `en.json`. Both files have exactly 410 keys with zero drift (diff produces empty output). Parameters (`{time}`, `{error}`, `{count}`) are consistent across locales. German translations use proper Umlaute. All UI components use `m.*()` calls — no hardcoded user-facing strings in M004 code.

The main finding is that **5 orphaned keys exist** — they're in the locale files but never referenced in code: `auth_validation_email_invalid`, `auth_validation_password_min`, `auth_validation_passwords_must_match`, `export_in_progress`, and `sync_status_retry`. These are harmless (unused keys don't cause runtime issues) and represent either forward preparation for Zod validation i18n (auth_validation_*) or alternative UI text that was designed but not used (export_in_progress, sync_status_retry). The Zod schema validation messages (D041) use default English strings, not the prepared i18n keys — this is a pre-existing pattern across the codebase (other form schemas like bodyweight also use default Zod messages) and is out of S05 scope.

**Recommendation: S05 is essentially already done.** The work reduces to a formal verification pass confirming zero drift, correct translations, and parameter consistency — plus an optional cleanup of orphaned keys. No new keys need to be added.

## Recommendation

Run a verification-only task:

1. **Verify zero key drift** — `diff` between sorted `de.json` and `en.json` keys. Already confirmed: 410 keys each, zero drift.
2. **Verify M004 translation quality** — Review all 45 M004 keys for correctness. Already reviewed: German uses proper Umlaute, translations are contextually accurate, parameters match.
3. **Verify no hardcoded strings** — Scan all S01–S04 `.svelte` files for user-facing text not wrapped in `m.*()`. Already confirmed: only a dev-only "Supported" string in the IAP testing section (inside `{#if dev}`, not user-facing).
4. **Clean up orphaned keys** (optional) — Remove 5 unused keys or wire them into the code. The `auth_validation_*` keys could be connected to the Zod schema, but per D041 that requires schemas inside `<script>` blocks, and the auth schema is a module-level `.ts` file. Recommend keeping orphaned keys for now — they may be used in future work and cause no harm.
5. **Run tests** — `pnpm --filter mobile test` (524 pass) and `pnpm --filter web test` (26 pass). Already confirmed passing.

No new keys need to be created. No translations need to be corrected. No parameters need fixing.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| i18n key drift detection | `jq -r 'keys[]' de.json \| sort` + `diff` | Already works, zero infrastructure needed |
| Parameter consistency check | Python script comparing `{param}` patterns across locale files | 15-line script, already validated — all parameters match |
| Translation compilation | `pnpm paraglide:compile` | Per AGENTS.md: trust that keys in locale JSON produce generated code at next build |

## Existing Code and Patterns

- `apps/mobile/messages/de.json` — 410 keys, base locale. All M004 keys already present with correct German translations using proper Umlaute (ü, ä, ö).
- `apps/mobile/messages/en.json` — 410 keys, matching de.json exactly. All M004 English translations present and semantically equivalent.
- `apps/mobile/project.inlang/settings.json` — Configures `baseLocale: "de"`, `locales: ["de", "en"]`. Only two locales exist — no es/fr/it to synchronize.
- `apps/web/messages/` — Only 2 generic placeholder keys (`app_title`, `app_description`). Web app is an API server — no M004 UI strings needed there. Note: web app uses `baseLocale: "en"` (opposite of mobile).
- S01–S04 `.svelte` files — All use `import { m } from '$lib/paraglide/messages.js'` and `m.*()` calls for every user-facing string. No hardcoded strings.
- `apps/mobile/src/lib/schemas/auth.ts` — Zod schema uses raw `'passwords_must_match'` string in `.refine()` message, not `m.auth_validation_passwords_must_match()`. This is because the schema is a module-level `.ts` file (not inside a Svelte `<script>` block), so `m.*()` would be evaluated at import time rather than validation time (D041 limitation).

## Constraints

- **Only two locales** — `de` and `en`. No additional locales (es, fr, it) exist in the project. AGENTS.md mentions supporting additional locales, but the project configuration only has two.
- **Base locale is `de`** — per `project.inlang/settings.json`. All key additions must start in `de.json`.
- **Orphaned keys are harmless** — Paraglide compiles all keys from locale files regardless of whether they're referenced. Unused keys add minimal bundle size (~50 bytes each) but cause no runtime issues.
- **Zod validation i18n requires schema restructuring** — Per D041, `m.*()` calls work in Zod schemas only when defined inside Svelte `<script>` blocks. The auth schema is a standalone `.ts` module. Connecting `auth_validation_*` keys requires either moving the schema inline or creating a schema factory — this is tech debt, not S05 scope.

## Common Pitfalls

- **Removing orphaned keys that are intentionally prepared** — The `auth_validation_*` keys were added with the intent of wiring Zod validation messages to i18n. Removing them would create rework if that integration is done later. Keep them.
- **Trying to fix Zod validation i18n in S05** — D041 says use `m.*()` in schemas defined in `<script>` blocks. The auth schema is a module file. Restructuring the schema is out of S05 scope — it's a code architecture change, not an i18n task.
- **Overlooking the web app locale files** — `apps/web/messages/` has its own de.json/en.json with only 2 placeholder keys. These don't need M004 updates since the web app is an API server with no user-facing M004 UI.

## Open Risks

- **None.** This slice has the lowest possible risk — it's a verification pass on work already completed by S01–S04. All 45 M004 keys exist, are translated, have matching parameters, and are actively used in the UI.

## Audit Results

### M004 Keys Inventory (45 keys, all present in both locales)

**Auth (S01) — 28 keys:**
- `auth_email_label`, `auth_email_placeholder`, `auth_password_label`, `auth_password_placeholder`
- `auth_confirm_password_label`, `auth_confirm_password_placeholder`
- `auth_signin_title`, `auth_signin_button`, `auth_signin_submitting`, `auth_signin_success`, `auth_signin_error`, `auth_signin_link`
- `auth_no_account`, `auth_has_account`
- `auth_signup_title`, `auth_signup_button`, `auth_signup_submitting`, `auth_signup_success`, `auth_signup_error`, `auth_signup_link`
- `auth_signout_button`, `auth_signout_success`, `auth_signout_error`
- `auth_settings_section`, `auth_settings_signed_in`
- `auth_validation_email_invalid`, `auth_validation_password_min`, `auth_validation_passwords_must_match` (orphaned — prepared but not wired to Zod schemas)

**Sync Status (S04) — 11 keys:**
- `sync_status_section`, `sync_status_synced`, `sync_status_syncing`, `sync_status_error`
- `sync_status_never`, `sync_status_just_now`, `sync_status_last_synced` (param: `{time}`)
- `sync_status_sync_now`, `sync_status_error_title`, `sync_status_error_description` (param: `{error}`)
- `sync_status_retry` (orphaned — not referenced in SyncStatusSection component)

**Export (S03) — 6 keys:**
- `export_section_label`, `export_csv_button`, `export_json_button`
- `export_success`, `export_error` (param: `{error}`)
- `export_in_progress` (orphaned — UI uses inline spinners + button text, not this key)

### Orphaned Keys (5 total)
| Key | Reason Orphaned | Recommendation |
|-----|----------------|----------------|
| `auth_validation_email_invalid` | Zod schema uses default messages, not i18n | Keep — future Zod i18n integration |
| `auth_validation_password_min` | Zod schema uses default messages, not i18n | Keep — future Zod i18n integration |
| `auth_validation_passwords_must_match` | Zod schema uses raw string `'passwords_must_match'` | Keep — future Zod i18n integration |
| `export_in_progress` | UI uses loading spinner + disabled state, not text | Keep — may be used in future UI revision |
| `sync_status_retry` | Component uses `sync_status_sync_now` for the retry action | Keep — may be used in future error UX |

### Hardcoded Strings Found (1, acceptable)
| Location | String | Why Acceptable |
|----------|--------|---------------|
| `settings/+page.svelte:479` | `"Supported"` | Inside `{#if dev}` block — dev-only IAP testing UI, never shown to users |

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Paraglide | — | No specific agent skill found; paraglide reference docs available at `./references/paraglide-js` |

No skill discovery needed — this slice involves no new technology integration. It's a pure verification task on existing i18n infrastructure.

## Sources

- Current locale file state verified via direct file inspection (`de.json`: 410 keys, `en.json`: 410 keys)
- UI component inspection of all S01–S04 `.svelte` files for `m.*()` usage
- D041 (Zod refinement i18n approach) from DECISIONS.md
- AGENTS.md i18n guidelines (base locale `de`, synchronization rules, Umlaut requirements)

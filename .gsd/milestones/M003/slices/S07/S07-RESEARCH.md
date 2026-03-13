# S07: i18n — New Keys for All Locales — Research

**Date:** 2026-03-13

## Summary

S07's roadmap description says "All new UI text from S01-S04 exists in both de.json and en.json with zero key drift. Estimated ~40-60 new keys per locale." The actual count is **46 new keys** added across M003 slices, and they **already exist in both locale files** with zero drift (365 keys each). Every key except one (`programs_template_creating`, intentionally spare) is referenced by a component. All parameter names match between locales. Both `pnpm test` (428 pass) and `pnpm run build` succeed.

The project is configured for exactly two locales (`de` and `en`) in `project.inlang/settings.json` — no es/fr/it locales exist despite AGENTS.md mentioning them generically. S01-S04 each proactively added their own i18n keys during component creation rather than deferring to S07, which means S07's planned work was front-loaded into earlier slices.

**The remaining work is strictly verification:** confirm zero drift, confirm all M003 component strings go through `m.*()`, confirm parameter parity, and confirm the build succeeds. A single verification task is sufficient.

## Recommendation

**Approach:** Single-task verification slice. Run the full i18n audit (key count, key diff, parameter match, unreferenced key scan, hardcoded string scan in M003 components), confirm build+test pass, and mark complete. No new keys need to be written.

**Why not skip S07?** The roadmap says "zero key drift" as a success criterion. Running the verification formally documents the audit trail and catches any regressions between now and slice completion.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| i18n key management | Paraglide + `messages/{locale}.json` | Already configured. `pnpm paraglide:compile` regenerates message functions. |
| Key drift detection | `jq 'keys \| length'` + `diff` on sorted keys | Simple bash one-liner confirms parity. No tool needed. |
| Parameter mismatch detection | Regex `\{(\w+)\}` extraction + set comparison | Python one-liner catches mismatched params between locales. |

## Existing Code and Patterns

- `apps/mobile/messages/de.json` — 365 keys (base locale, source of truth). 46 keys added during M003.
- `apps/mobile/messages/en.json` — 365 keys (identical key set to de.json). All M003 keys have quality English translations.
- `apps/mobile/project.inlang/settings.json` — Configured locales: `["de", "en"]` only. Base locale: `de`.
- `apps/mobile/src/lib/components/premium/PaywallDrawer.svelte` — 17 `paywall_*` keys, all via `m.*()`. No hardcoded strings.
- `apps/mobile/src/lib/components/premium/UpgradePrompt.svelte` — 1 new key (`premium_upgrade_description_premium_templates`).
- `apps/mobile/src/lib/components/programs/TemplateBrowserDrawer.svelte` — 7 `programs_template_*` keys via `m.*()`.
- `apps/mobile/src/lib/components/programs/TemplateBrowserCard.svelte` — 1 `programs_template_premium_badge` key + reuses existing `onboarding_template_days_count`.
- `apps/mobile/src/routes/settings/+page.svelte` — 19 keys: 11 `settings_iap_*` (S01) + 8 `settings_subscription_*` (S03).

## Key Inventory — M003 Additions (46 keys)

### From S01 (IAP Testing UI): 11 keys
- `settings_iap_billing_checking`, `settings_iap_billing_not_supported`, `settings_iap_billing_supported`
- `settings_iap_load_products`, `settings_iap_no_products`, `settings_iap_purchase_annual`
- `settings_iap_restore`, `settings_iap_restored_count` (param: `{count}`)
- `settings_iap_test_label`, `settings_iap_transaction_error` (param: `{error}`)
- `settings_iap_transaction_success` (param: `{id}`)

### From S03 (Paywall & Subscription Management): 25 keys
- `paywall_error_retry`, `paywall_error_unavailable`, `paywall_loading`
- `paywall_per_month`, `paywall_per_year`, `paywall_privacy_policy`
- `paywall_purchase_subscription`, `paywall_purchase_success`, `paywall_purchase_template_pack`
- `paywall_restore_purchases`, `paywall_section_subscriptions`, `paywall_section_template_pack`
- `paywall_subtitle`, `paywall_terms_auto_renewal`, `paywall_terms_cancellation`
- `paywall_terms_of_service`, `paywall_title`
- `settings_subscription_current_plan`, `settings_subscription_free`, `settings_subscription_label`
- `settings_subscription_manage`, `settings_subscription_restore`
- `settings_subscription_restore_error` (param: `{error}`), `settings_subscription_restore_none`
- `settings_subscription_restore_success` (param: `{count}`)

### From S04 (Template Browsing): 10 keys
- `premium_upgrade_description_premium_templates`
- `programs_template_button`, `programs_template_creating` (unused — spare)
- `programs_template_drawer_description`, `programs_template_drawer_title`
- `programs_template_error`, `programs_template_premium_badge`
- `programs_template_section_free`, `programs_template_section_premium`
- `programs_template_success`

### From S05/S06: 0 keys
No new paraglide message keys were added in S05 or S06. Store metadata lives in fastlane files, not the i18n system.

## Constraints

- **Only 2 locales configured:** `de` and `en`. No es/fr/it locale files exist in this project. AGENTS.md mentions them generically but `project.inlang/settings.json` is the source of truth.
- **Template names/descriptions are NOT i18n'd:** Per D085, template `name` and `description` fields are hardcoded English strings in data files, matching the free template pattern. Only UI chrome around templates is i18n'd.
- **Product titles/prices come from store:** PaywallDrawer displays `product.title` and `product.priceString` from StoreKit/Play Billing (dynamic, localized by the OS). These are intentionally not in the message files.
- **`programs_template_creating` is intentionally spare:** Defined in both locales but not referenced by any component. S04 summary noted this.

## Common Pitfalls

- **Treating the key audit as the end goal** — The real goal is "zero drift." Previous slices already achieved this. S07 should confirm, not re-do.
- **Adding locales that aren't configured** — The project only has de+en. Adding es/fr/it would require updating `project.inlang/settings.json` and creating new message files — that's a different scope.
- **Missing parameter names in translations** — Already verified: all `{param}` names match between de and en for all 46 new keys.

## Open Risks

- **Near-zero risk.** All work was front-loaded into S01-S04. The only risk is a key being added to one locale but not the other between S04 completion and S07 verification — confirmed not the case (diff shows identical key sets).

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Paraglide i18n | `oimiragieo/agent-studio@paraglide-js-internationalization-i18n` | available (27 installs) — low relevance, not needed for verification-only work |

No skills worth installing for this slice — it's a verification pass, not implementation work.

## Sources

- `apps/mobile/messages/de.json` and `en.json` — direct inspection of 365 keys each
- `apps/mobile/project.inlang/settings.json` — locale configuration (`["de", "en"]`)
- `git show gsd/M002/S07:apps/mobile/messages/de.json` — 319 keys at M002 completion (baseline)
- M003 component source: PaywallDrawer.svelte, TemplateBrowserDrawer.svelte, TemplateBrowserCard.svelte, UpgradePrompt.svelte, settings/+page.svelte
- S03-SUMMARY.md, S04-SUMMARY.md — confirmed key additions and counts

---
estimated_steps: 4
estimated_files: 4
---

# T04: Add i18n keys for template browsing UI (de + en)

**Slice:** S04 — Premium Program Templates
**Milestone:** M003

## Description

Add all i18n keys needed by the template browsing UI to `de.json` (base locale) and `en.json`. Update the Svelte components from T03 to use `m.*()` calls instead of any hardcoded strings. Verify zero key drift between de and en.

## Steps

1. Audit `TemplateBrowserDrawer.svelte` and `TemplateBrowserCard.svelte` for all user-visible strings. Identify keys needed:
   - Drawer title (e.g. "Vorlage waehlen" / "Choose Template")
   - Drawer description
   - Free section header (e.g. "Vorlagen" / "Templates")
   - Premium section header (e.g. "Premium-Vorlagen" / "Premium Templates")
   - Premium badge label (e.g. "Premium")
   - Template creation success toast
   - Template creation loading text
   - "From Template" button label on Programs page
   - Any empty state or error text
2. Add all new keys to `de.json` (German base locale, proper Umlaute). Keys should follow existing naming pattern: `template_browser_*` prefix.
3. Add corresponding keys to `en.json` with English translations.
4. Update components to use `m.*()` calls for all strings. Verify `pnpm run build` succeeds and key counts match.

## Must-Haves

- [ ] All user-visible strings in template browsing UI use `m.*()` calls
- [ ] Keys added to `de.json` first (base locale, source of truth)
- [ ] Same keys added to `en.json` with proper English translations
- [ ] `de.json` and `en.json` have identical key counts
- [ ] German text uses proper Umlaute (ae → ä, oe → ö, ue → ü)
- [ ] No emojis in any translation strings
- [ ] `pnpm run build` succeeds

## Verification

- `cd apps/mobile && jq 'keys | length' messages/de.json` equals `jq 'keys | length' messages/en.json`
- `pnpm run build` — zero errors
- Grep for hardcoded German/English strings in `TemplateBrowserDrawer.svelte` and `TemplateBrowserCard.svelte` — should find none (all strings via `m.*()`)

## Observability Impact

- Signals added/changed: None — i18n is a build-time concern
- How a future agent inspects this: Check key counts with `jq 'keys | length' messages/*.json`, diff keys with `jq -r 'keys[]' messages/de.json | sort` vs other locales
- Failure state exposed: Missing key → runtime error in `m.*()` call (visible in browser console)

## Inputs

- `src/lib/components/programs/TemplateBrowserDrawer.svelte` — component from T03 with strings to localize
- `src/lib/components/programs/TemplateBrowserCard.svelte` — component from T03 with strings to localize
- `src/routes/programs/+page.svelte` — "From Template" button text
- `apps/mobile/messages/de.json` — existing base locale (356 keys)
- `apps/mobile/messages/en.json` — existing English locale

## Expected Output

- `apps/mobile/messages/de.json` — extended with ~8-12 new `template_browser_*` keys
- `apps/mobile/messages/en.json` — extended with same keys, English translations
- `src/lib/components/programs/TemplateBrowserDrawer.svelte` — updated to use `m.*()` calls
- `src/lib/components/programs/TemplateBrowserCard.svelte` — updated to use `m.*()` calls (if any strings)
- `src/routes/programs/+page.svelte` — "From Template" button uses `m.*()` call

---
id: T04
parent: S04
milestone: M003
provides:
  - Verified all template browsing UI strings use m.*() i18n calls (9 keys in de.json and en.json)
key_files:
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - none — T03 already completed all i18n work for this task
patterns_established:
  - programs_template_* key prefix for template browsing UI strings
observability_surfaces:
  - none — i18n is a build-time concern; missing keys produce runtime errors in m.*() calls visible in browser console
duration: 2m
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T04: Add i18n keys for template browsing UI (de + en)

**Verified that T03 already shipped all 9 i18n keys in de.json and en.json with full m.*() wiring in components.**

## What Happened

T03 proactively added all i18n keys and wired all `m.*()` calls during component creation, leaving no work for T04. Audit confirmed:

- **9 keys** with `programs_template_*` prefix exist in both `de.json` and `en.json`
- Keys cover: drawer title, drawer description, free section header, premium section header, premium badge, "From Template" button, creation success toast, creation error toast, creating loading text
- `TemplateBrowserCard.svelte` uses `m.onboarding_template_days_count()` and `m.programs_template_premium_badge()`
- `TemplateBrowserDrawer.svelte` uses `m.programs_template_drawer_title()`, `m.programs_template_drawer_description()`, `m.programs_template_section_free()`, `m.programs_template_section_premium()`, `m.programs_template_success()`, `m.programs_template_error()`
- `+page.svelte` uses `m.programs_template_button()` for the "From Template" FAB
- Zero hardcoded German or English strings in any template browser component
- `programs_template_creating` key is defined but unused (available for future loading text if needed)

## Verification

- `jq 'keys | length' messages/de.json` → 365
- `jq 'keys | length' messages/en.json` → 365 (match ✓)
- `pnpm run build` → zero errors ✓
- `pnpm test` → 428 passed ✓
- Grep for hardcoded strings in TemplateBrowserCard/Drawer → none found ✓
- All 9 `programs_template_*` keys present in both locale files ✓
- `PROGRAM_TEMPLATES` still contains exactly 3 free templates (onboarding unchanged) ✓

## Diagnostics

- Inspect key counts: `jq 'keys | length' apps/mobile/messages/de.json apps/mobile/messages/en.json`
- Diff keys: `jq -r 'keys[]' messages/de.json | sort` vs `jq -r 'keys[]' messages/en.json | sort`
- Missing key at runtime: `m.*()` call throws error visible in browser console

## Deviations

No code changes needed — T03 already completed all i18n work planned for T04. This task served as verification-only.

## Known Issues

- `programs_template_creating` key exists in both locale files but is not referenced by any component. It's available for future use if a loading text is added to the template creation flow.

## Files Created/Modified

No files modified — all work was completed in T03.

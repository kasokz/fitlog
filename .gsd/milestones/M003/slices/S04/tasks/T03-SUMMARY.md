---
id: T03
parent: S04
milestone: M003
provides:
  - TemplateBrowserCard component with premium lock indicator and loading state
  - TemplateBrowserDrawer listing 8 templates (3 free + 5 premium) with premium gate
  - Programs page updated with "From Template" action alongside existing "Create Program"
  - 9 new i18n keys in de.json and en.json for template browser UI
key_files:
  - apps/mobile/src/lib/components/programs/TemplateBrowserCard.svelte
  - apps/mobile/src/lib/components/programs/TemplateBrowserDrawer.svelte
  - apps/mobile/src/routes/programs/+page.svelte
  - apps/mobile/messages/de.json
  - apps/mobile/messages/en.json
key_decisions:
  - Two-FAB layout with "From Template" (outline variant) stacked above "Create Program" (primary) in a vertical flex column
  - TemplateBrowserCard is a standalone component separate from onboarding TemplateCard to accommodate lock/loading states without modifying onboarding code
patterns_established:
  - Premium-gated template selection pattern: check canAccessFeature() on drawer open, store in local state, gate handleSelect based on template.premium && !premiumUnlocked, open PaywallDrawer for locked templates
  - PaywallDrawer onpurchasecomplete re-checks premium access and updates lock state in-place without re-opening the template drawer
observability_surfaces:
  - "[Premium] canAccessFeature(premium_templates)" logs on drawer open show gate result
  - "[TemplateService]" prefixed logs cover program creation flow
  - "[TemplateBrowser] Creation failed" console error on template creation failure
  - Toast notifications for success/error states visible in UI
duration: 15min
verification_result: passed
completed_at: 2026-03-13
blocker_discovered: false
---

# T03: Build template browsing Drawer on Programs page with premium gate

**Built TemplateBrowserDrawer with 8 templates (3 free + 5 premium), premium gate via canAccessFeature(), PaywallDrawer integration, and "From Template" FAB on Programs page.**

## What Happened

Created two new components and updated the Programs page:

1. **TemplateBrowserCard.svelte** — Extends the onboarding TemplateCard pattern with: Lock icon in the icon box for locked premium templates, Loader2 spinner during creation, "Premium" badge with lock icon for premium templates, disabled state during loading.

2. **TemplateBrowserDrawer.svelte** — vaul-svelte Drawer listing all 8 templates in two sections ("Vorlagen" for free, "Premium-Vorlagen" for premium). On open, calls `canAccessFeature(PremiumFeature.premium_templates)` to determine lock state. Tapping a locked premium template opens PaywallDrawer; tapping a free or unlocked premium template calls `createProgramFromTemplate()`. Loading state prevents double-tap. PaywallDrawer `onpurchasecomplete` re-checks premium access to unlock templates without re-opening the drawer.

3. **Programs +page.svelte** — Added a second FAB button "Aus Vorlage" (From Template) with BookTemplate icon in outline variant, stacked above the existing "Neues Programm" primary button. Both share the same `handleProgramCreated` callback that reloads the programs list. Existing manual create flow is completely unchanged.

4. **i18n** — Added 9 new keys to both de.json and en.json (programs_template_button, programs_template_drawer_title, programs_template_drawer_description, programs_template_section_free, programs_template_section_premium, programs_template_premium_badge, programs_template_creating, programs_template_success, programs_template_error). Key counts synchronized at 365.

## Verification

- `pnpm run build` — zero errors, built in ~43s
- `pnpm test` — 428 tests passed (17 test files)
- i18n key count: de.json = 365, en.json = 365 (identical)
- PROGRAM_TEMPLATES still contains exactly 3 free templates (onboarding unchanged)
- Code review: `canAccessFeature()` is called on drawer open and gates `createProgramFromTemplate()` for premium templates (not just cosmetic)
- All 9 new i18n keys present in both locales with proper translations

### Slice Verification Status (T03 of 4 tasks)
- [x] `cd apps/mobile && pnpm test` — 428 tests pass (>= 420)
- [x] `pnpm run build` — zero errors
- [x] PROGRAM_TEMPLATES has exactly 3 free templates
- [x] i18n key counts: de.json = en.json = 365
- [ ] Visual check on dev server — deferred to T04 or manual check (dev server not started per guidelines)

## Diagnostics

- Open Programs page → tap "Aus Vorlage" → browser console shows `[Premium] canAccessFeature(premium_templates)` log
- Selecting a template logs `[TemplateService] Starting program creation from template: <id>` and subsequent creation logs
- Failed creation shows `[TemplateBrowser] Creation failed:` in console + error toast in UI
- Dev override: `setPremiumStatus(true)` unlocks all premium templates for testing

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `apps/mobile/src/lib/components/programs/TemplateBrowserCard.svelte` — New component: template card with lock/loading/premium badge
- `apps/mobile/src/lib/components/programs/TemplateBrowserDrawer.svelte` — New component: drawer listing all templates with premium gate and PaywallDrawer integration
- `apps/mobile/src/routes/programs/+page.svelte` — Added "From Template" FAB and TemplateBrowserDrawer
- `apps/mobile/messages/de.json` — Added 9 template browser i18n keys (365 total)
- `apps/mobile/messages/en.json` — Added 9 template browser i18n keys (365 total)

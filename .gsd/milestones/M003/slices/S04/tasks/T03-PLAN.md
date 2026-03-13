---
estimated_steps: 5
estimated_files: 4
---

# T03: Build template browsing Drawer on Programs page with premium gate

**Slice:** S04 — Premium Program Templates
**Milestone:** M003

## Description

Build the template browsing UI: a Drawer accessible from the Programs page that lists all 8 templates (3 free + 5 premium), distinguishes premium templates with a lock icon and visual premium indicator, enforces the premium gate via `canAccessFeature(PremiumFeature.premium_templates)`, and opens the PaywallDrawer for unpurchased premium templates. Free templates and purchased premium templates create programs via `createProgramFromTemplate()`. The existing manual "Create Program" flow on the Programs page remains untouched.

## Steps

1. Create `TemplateBrowserCard.svelte` — a card component for template display in the browsing Drawer. Extends the `TemplateCard` pattern (Card with icon, name, description, day count badge). Adds: Lock icon overlay for premium templates when not purchased, "Premium" badge for premium templates. Props: `template: ProgramTemplate`, `locked: boolean`, `loading: boolean`, `onselect: (template) => void`.
2. Create `TemplateBrowserDrawer.svelte` — a vaul-svelte Drawer (D079 pattern) containing:
   - On mount: check `canAccessFeature(PremiumFeature.premium_templates)` to determine lock state
   - Two sections: "Vorlagen" (free templates from `PROGRAM_TEMPLATES`) and "Premium-Vorlagen" (from `PREMIUM_PROGRAM_TEMPLATES`)
   - Each template rendered via `TemplateBrowserCard`
   - Selection handler: if template is free OR premium access is granted → call `createProgramFromTemplate(template)`, show success toast, close drawer, trigger `oncreated` callback. If template is premium and locked → open PaywallDrawer.
   - PaywallDrawer `onpurchasecomplete` callback → re-check `canAccessFeature()`, update lock state, user can now select the template
   - Loading state while `createProgramFromTemplate()` runs (prevent double-tap)
   - Error handling: toast on creation failure
3. Update `+page.svelte` (Programs page):
   - Add a second button alongside the existing FAB or replace the single FAB with a two-option approach: keep existing "Create Program" button, add a "From Template" button that opens `TemplateBrowserDrawer`
   - Import and wire `TemplateBrowserDrawer` with `oncreated` callback that reloads the programs list
   - Existing manual create flow via ProgramForm Drawer remains completely unchanged
4. Wire the post-creation navigation: after `createProgramFromTemplate()` succeeds, close the drawer and reload the programs list (same pattern as `handleProgramCreated` in the existing manual create flow)
5. Verify: `pnpm run build` succeeds, all components compile without errors

## Must-Haves

- [ ] `TemplateBrowserCard` renders template name, description, day count, premium indicator (lock icon + badge for premium, nothing for free)
- [ ] `TemplateBrowserDrawer` lists all 8 templates in two sections (free / premium)
- [ ] Premium gate checked via `canAccessFeature(PremiumFeature.premium_templates)` on drawer open
- [ ] Tapping a locked premium template opens PaywallDrawer (not `createProgramFromTemplate()`)
- [ ] Tapping a free template OR an unlocked premium template calls `createProgramFromTemplate()` and closes the drawer
- [ ] PaywallDrawer `onpurchasecomplete` re-checks premium status — templates unlock without re-opening the drawer
- [ ] Existing manual "Create Program" flow on Programs page is untouched
- [ ] Loading state prevents double-tap during template creation
- [ ] `pnpm run build` succeeds

## Verification

- `pnpm run build` — zero errors
- Visual check on dev server: Programs page shows both create actions, template Drawer opens with 8 templates, premium templates have lock indicators, existing manual create still works
- Code review: `canAccessFeature()` is called before `createProgramFromTemplate()` for premium templates (not just a cosmetic lock icon)

## Observability Impact

- Signals added/changed: Console logs from existing `[Premium] canAccessFeature(premium_templates)` and `[TemplateService]` prefixed logs cover the runtime flow. No additional logging needed.
- How a future agent inspects this: Open Programs page in dev server, check browser console for `[Premium]` and `[TemplateService]` logs during template selection
- Failure state exposed: `createProgramFromTemplate()` failure shows error toast. Premium gate denial logged by premium service.

## Inputs

- `src/lib/data/templates/index.ts` — `PROGRAM_TEMPLATES`, `PREMIUM_PROGRAM_TEMPLATES`, `ALL_TEMPLATES` from T01
- `src/lib/services/premium.ts` — `canAccessFeature`, `PremiumFeature.premium_templates`
- `src/lib/components/premium/PaywallDrawer.svelte` — purchase flow integration
- `src/lib/db/services/template-service.ts` — `createProgramFromTemplate()`
- `src/lib/components/onboarding/TemplateCard.svelte` — visual pattern reference
- `src/routes/programs/+page.svelte` — Programs page to modify

## Expected Output

- `src/lib/components/programs/TemplateBrowserCard.svelte` — new component
- `src/lib/components/programs/TemplateBrowserDrawer.svelte` — new component
- `src/routes/programs/+page.svelte` — updated with template browsing action

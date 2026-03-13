---
estimated_steps: 5
estimated_files: 4
---

# T01: Create haptics service and settings page with mode toggle

**Slice:** S06 — Design Polish & Platform Builds
**Milestone:** M001

## Description

Create two foundational pieces for S06: (1) a haptics service that wraps `@capacitor/haptics` with semantic methods and a web-safe fallback, and (2) a settings page at `/settings` with a dark/light/system mode toggle using `mode-watcher`. The haptics service will be consumed by T03 (workout wiring). The settings page fulfills R034 (dark/light mode) and provides the user-facing mode control.

## Steps

1. Create `src/lib/services/haptics.ts` — import `Haptics`, `ImpactStyle`, `NotificationType` from `@capacitor/haptics`. Export async functions: `impactLight()`, `impactMedium()`, `impactHeavy()`, `notifySuccess()`, `selectionChanged()`. Each wraps the Capacitor API call in try/catch (web no-ops silently). Add `console.debug('[Haptics] methodName()')` in each for dev observability. All functions are fire-and-forget (return `void`).
2. Create `src/routes/settings/+page.svelte` — import `mode` and `setMode` from `mode-watcher`. Build a settings page with a heading and a theme section. Use shadcn-svelte `ToggleGroup` (or `RadioGroup`) with three options: system, light, dark. Bind current value to `mode.current`. On change, call `setMode(value)`. Use the same `container mx-auto max-w-lg` page layout pattern as other routes.
3. Add i18n keys to `messages/de.json`: `settings_title`, `settings_theme_label`, `settings_theme_system`, `settings_theme_light`, `settings_theme_dark`, and `nav_settings`.
4. Import `m.*` message functions in the settings page for all user-facing text.
5. Run `pnpm --filter @repo/mobile check` to verify no type errors.

## Must-Haves

- [ ] Haptics service file exists at `src/lib/services/haptics.ts` with 5 exported functions
- [ ] Each haptics function has try/catch and debug logging
- [ ] Settings page exists at `src/routes/settings/+page.svelte`
- [ ] Mode toggle shows current mode and allows switching between system/light/dark
- [ ] All user-facing text uses `m.*()` i18n functions
- [ ] New i18n keys added to `de.json`

## Verification

- `pnpm --filter @repo/mobile check` exits 0
- `test -f apps/mobile/src/lib/services/haptics.ts` exits 0
- `test -f apps/mobile/src/routes/settings/+page.svelte` exits 0
- `grep 'impactMedium\|impactLight\|impactHeavy\|notifySuccess\|selectionChanged' apps/mobile/src/lib/services/haptics.ts` shows all 5 functions
- `grep 'setMode\|mode' apps/mobile/src/routes/settings/+page.svelte` shows mode-watcher integration

## Observability Impact

- Signals added/changed: `console.debug('[Haptics] <method>()')` on every haptics call for dev-mode verification
- How a future agent inspects this: Open browser console during workout flow — haptic debug logs confirm calls are firing
- Failure state exposed: try/catch in haptics service logs errors to console.error without crashing

## Inputs

- `references/capacitor-haptics/src/definitions.ts` — Haptics API surface (ImpactStyle, NotificationType enums)
- `mode-watcher` API — `setMode()`, `mode` state (from Context7 research)
- Existing page layout pattern — `section.container.mx-auto.max-w-lg.px-4.py-4` used across all routes
- `packages/ui/src/components/ui/toggle-group/` — shadcn-svelte toggle-group component

## Expected Output

- `apps/mobile/src/lib/services/haptics.ts` — New haptics service with 5 semantic methods
- `apps/mobile/src/routes/settings/+page.svelte` — New settings page with dark/light/system mode toggle
- `apps/mobile/messages/de.json` — Updated with ~6 new settings-related keys

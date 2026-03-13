# S06: Design Polish & Platform Builds — Research

**Date:** 2026-03-12

## Summary

S06 covers four major workstreams: (1) UI polish across all existing screens to deliver the neobrutalist design promise, (2) haptic feedback integration on key actions, (3) dark/light mode toggle wiring, and (4) native iOS + Android project scaffolding with Capacitor. The codebase from S01–S05 is functional but utilitarian — screens use basic layouts with minimal design distinction. No haptics service exists, no theme toggle UI exists, and no native projects are scaffolded yet. The design system (oklch tokens, hard shadows, 0px radius) is already defined in `globals.css` and the 50+ shadcn-svelte components are available, but they're underutilized in the current screens.

The primary risk is scope — "polish all screens" is broad and could spiral. The recommendation is to split the work into focused tasks: a haptics utility service, a settings/theme toggle, exercise reorder upgrade (dnd-kit per D020), per-screen polish passes grouped by feature area, and native project scaffolding as a separate task. The Capacitor scaffolding is straightforward (`npx cap add ios`, `npx cap add android`, update `capacitor.config.ts`) but requires a working `build` output first.

dnd-kit has a first-class Svelte 5 adapter (`@dnd-kit/svelte`) using runes and the `{@attach}` directive. The `createSortable` primitive is exactly what's needed for exercise reorder in `ExerciseAssignmentList.svelte`, fulfilling D020's upgrade from up/down buttons.

## Recommendation

1. **Haptics service first** — Create `src/lib/services/haptics.ts` wrapping `@capacitor/haptics` with a safe no-op fallback for web. Expose semantic methods: `impactLight()`, `impactMedium()`, `notifySuccess()`, `selectionChanged()`. Wire into set confirmation, workout finish, and stepper long-press.

2. **Settings page with theme toggle** — Add a `/settings` route with dark/light/system mode selector using `mode-watcher`'s `setMode()` and `mode` state. Add settings link to home page grid.

3. **dnd-kit exercise reorder** — Replace up/down `ChevronUp`/`ChevronDown` buttons in `ExerciseAssignmentList.svelte` with `@dnd-kit/svelte/sortable`. Requires installing `@dnd-kit/svelte` package.

4. **Screen-by-screen polish** — Bottom navigation bar, safe-area padding, consistent header patterns, improved card designs, micro-animations. Group by complexity: home + layout first, then content pages.

5. **Native platform scaffolding** — Update `capacitor.config.ts` (appId, appName), run `pnpm build`, then `npx cap add ios` + `npx cap add android`, then `npx cap sync`. Generate app icons and splash screens with `@capacitor/assets`.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Haptic feedback API | `@capacitor/haptics` (already in deps) | Native Taptic Engine / Vibrator with proper fallback |
| Dark/light mode | `mode-watcher` (already in deps, `<ModeWatcher>` in layout) | `toggleMode()`, `setMode()`, `mode.current` state |
| Drag-and-drop reorder | `@dnd-kit/svelte` v0.3.2 (in `references/dnd-kit`) | Svelte 5 runes-native, `createSortable` + `{@attach}` directive |
| App icons & splash | `@capacitor/assets` (already in deps) | Generates all platform-specific sizes from a single source |
| Safe area insets | `@capacitor-community/safe-area` (already in deps) + CSS utilities in globals.css | `pt-safe-top`, `pb-safe-bottom`, etc. already defined |
| Toast notifications | `svelte-sonner` (already in deps, `<Toaster>` in layout) | Already wired and used across screens |

## Existing Code and Patterns

- `packages/ui/src/globals.css` — Full neobrutalist theme tokens (oklch colors, hard shadows `4px 4px 0px`, `--radius: 0px`, DM Sans + Space Mono fonts). Safe-area utility classes defined (`pt-safe-top`, `pb-safe-bottom`, `pt-safe-top-*`, etc.). Dark mode tokens fully defined. Coach mark styles for driver.js. **This is the design foundation — all polish should leverage these tokens.**
- `packages/ui/src/components/ui/` — 50+ shadcn-svelte components available (card, button, badge, drawer, alert-dialog, sheet, toggle-group, empty, button-group, etc.). Currently underutilized.
- `apps/mobile/src/routes/+layout.svelte` — Root layout with `<ModeWatcher />` and `<Toaster />`. Onboarding guard already in place. No bottom nav, no safe-area padding, no settings access.
- `apps/mobile/src/routes/+page.svelte` — Home page uses basic 2x2 card grid. Functional but needs: page header with settings link, bottom tab navigation, neobrutalist card styling (hard shadows, bold borders).
- `apps/mobile/src/routes/workout/[sessionId]/+page.svelte` — 398-line workout page. Rest timer is fixed at bottom. No haptics on set confirm. Good candidate for haptic integration.
- `apps/mobile/src/lib/components/workout/Stepper.svelte` — Long-press acceleration already works. Add haptic `selectionChanged()` on each value change for premium feel.
- `apps/mobile/src/lib/components/workout/SetRow.svelte` — Set confirm button (check icon) — primary haptic target (`impactMedium` on confirm).
- `apps/mobile/src/lib/components/programs/ExerciseAssignmentList.svelte` — Currently uses `ChevronUp`/`ChevronDown` buttons for reorder. D020 explicitly says "upgrade to dnd-kit in S06".
- `apps/mobile/capacitor.config.ts` — Currently has placeholder `appId: 'com.example.myapp'` and `appName: 'My App'`. Must be updated before native scaffold.
- `apps/mobile/src/lib/paraglide/` — Paraglide i18n configured. All screens use `m.*()` message functions. 230 keys in `de.json`.

## Constraints

- **No native projects exist yet** — `ios/` and `android/` directories don't exist. Must `npx cap add` both.
- **`appId` must be set before native scaffold** — `com.example.myapp` is a placeholder. Needs proper reverse-domain ID (e.g., `com.fitlog.app`).
- **`@capacitor/assets` needs source images** — No `icon.png` or `splash.png` exist. Need to create or source them before generating platform assets.
- **dnd-kit requires Svelte 5.29+** — Current Svelte is `^5.45.6`, so peer dep is satisfied.
- **`@dnd-kit/svelte` uses `{@attach}` directive** — This is a Svelte 5.29+ feature (attachments). Ensure the build toolchain supports it.
- **Web fallback for haptics** — `@capacitor/haptics` calls resolve as no-op on web (per their docs), so the service just needs try/catch, not platform detection.
- **No settings route exists** — Must create `/settings` route, add it to navigation, and add i18n keys for de.json.
- **`build` output dir is `build/`** — `capacitor.config.ts` has `webDir: 'build'` which aligns with `@sveltejs/adapter-static`.

## Common Pitfalls

- **Scope creep on "polish"** — Define explicit per-screen acceptance criteria. Don't try to redesign — enhance what exists with the design system tokens.
- **dnd-kit touch sensor conflicts with scroll** — On mobile, drag gestures can conflict with scrolling. dnd-kit's `PointerSensor` has activation constraints (distance/delay) to distinguish drag from scroll. Must configure `activationConstraint: { distance: 8 }` or similar.
- **Safe area not applied** — The CSS utilities exist but aren't used anywhere in current routes. Must add `pt-safe-top` to layout header and `pb-safe-bottom` to layout main or bottom nav.
- **Capacitor `cap add` must run after `pnpm build`** — The `build/` directory must exist for `cap add` to succeed. Run build first.
- **App icon format requirements** — `@capacitor/assets` expects a 1024x1024 PNG for the icon and a 2732x2732 PNG for the splash. Smaller sources get stretched poorly.
- **Haptics on web during development** — Calls won't error but won't do anything. Can only verify on real device or simulator. Log haptic events in dev for debugging.
- **Bottom nav z-index conflicts** — Rest timer is `fixed bottom-0 z-40`. Bottom nav needs to coordinate z-index and avoid overlapping during active workouts.

## Open Risks

- **App icon and splash screen source images** — No design assets exist. Need to either create them programmatically (simple geometric neobrutalist logo) or ask the user to provide them. This could block native project scaffolding.
- **dnd-kit `{@attach}` directive** — This is relatively new in Svelte 5. If the build toolchain has issues, may need to fall back to `use:` action pattern or stick with up/down buttons.
- **Capacitor 8 + SvelteKit static adapter compatibility** — Should work (Capacitor just serves static files), but first-time scaffold could surface unexpected issues with plugin registration or web view configuration.
- **Polish scope estimation** — 9 screens × components = many small changes. Risk of underestimating if each screen needs significant rework vs. minor tweaks.
- **Bottom navigation vs. current home-grid pattern** — Adding a bottom tab bar is a structural change to the layout. The current home page is a grid of 4 cards. A bottom nav would change navigation patterns across the app.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Capacitor | `cap-go/capacitor-skills@capacitor-best-practices` | available (295 installs) |
| Capacitor | `cap-go/capacitor-skills@capacitor-plugins` | available (127 installs) |
| Capacitor | `cap-go/capacitor-skills@capacitor-app-store` | available (78 installs) |
| Svelte | `sveltejs/ai-tools@svelte-code-writer` | available (2.5K installs) |
| Svelte | `ejirocodes/agent-skills@svelte5-best-practices` | available (2.1K installs) |
| Tailwind | `wshobson/agents@tailwind-design-system` | available (17.6K installs) |
| Tailwind + shadcn | `jezweb/claude-skills@tailwind-v4-shadcn` | available (2.7K installs) |

**Recommended installs:** `cap-go/capacitor-skills@capacitor-best-practices` (directly relevant to native scaffolding work) and `cap-go/capacitor-skills@capacitor-plugins` (covers haptics and other plugin integration).

## Sources

- Capacitor Haptics API: `impact()`, `notification()`, `vibrate()`, `selectionStart/Changed/End()` with `ImpactStyle.Light/Medium/Heavy` and `NotificationType.Success/Warning/Error` (source: `references/capacitor-haptics/src/definitions.ts`)
- dnd-kit Svelte adapter: `createSortable` from `@dnd-kit/svelte/sortable`, uses `{@attach}` directive, Svelte 5.29+ required (source: `references/dnd-kit/packages/svelte/README.md`)
- mode-watcher API: `toggleMode()`, `setMode('light'|'dark'|'system')`, `mode.current` reactive state (source: Context7 `/svecosystem/mode-watcher`)
- D020 decision: "Simple reordering with sort_order column. dnd-kit drag-and-drop deferred to S06 polish."
- Capacitor CLI: `npx cap add ios`, `npx cap add android`, then `npx cap sync` (source: `references/capacitor/cli/README.md`)
- Safe area utilities already defined in globals.css: `pt-safe-top`, `pb-safe-bottom`, `pt-safe-top-*`, `pb-safe-bottom-*`, margin variants (source: `packages/ui/src/globals.css`)

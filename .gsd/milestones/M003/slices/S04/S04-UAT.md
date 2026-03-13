# S04: Premium Program Templates — UAT

**Milestone:** M003
**Written:** 2026-03-13

## UAT Type

- UAT mode: mixed (artifact-driven for data integrity + live-runtime for UI flow)
- Why this mode is sufficient: Template data integrity is fully covered by 19 automated tests. UI flow requires visual check on dev server to verify drawer layout, premium indicators, and gate behavior.

## Preconditions

- Dev server running (`pnpm dev` in apps/mobile)
- Dev premium override available: call `setPremiumStatus(true)` in browser console to simulate premium access, or `setPremiumStatus(false)` for free user

## Smoke Test

Open Programs page → tap "Aus Vorlage" / "From Template" button → drawer opens showing 8 templates in two sections (3 free, 5 premium with lock icons).

## Test Cases

### 1. Free template creation from browser

1. Open Programs page
2. Tap "Aus Vorlage" / "From Template" button
3. Verify drawer opens with two sections: free templates (3) and premium templates (5)
4. Tap a free template (e.g., "Push Pull Legs")
5. **Expected:** Program is created, success toast appears, drawer closes, new program visible in list

### 2. Premium template blocked for free user

1. Ensure premium is off: `setPremiumStatus(false)` in console
2. Open template browser drawer
3. Verify premium templates show lock icon and "Premium" badge
4. Tap a premium template (e.g., "Periodized Strength 531")
5. **Expected:** PaywallDrawer opens instead of creating the program

### 3. Premium template creation after purchase

1. Enable premium: `setPremiumStatus(true)` in console
2. Open template browser drawer
3. Verify premium templates no longer show lock icons
4. Tap a premium template
5. **Expected:** Program is created, success toast appears, drawer closes, new program visible in list

### 4. Post-purchase unlock in same session

1. Start with premium off: `setPremiumStatus(false)`
2. Open template browser drawer
3. Tap a locked premium template → PaywallDrawer opens
4. In a separate console tab, run `setPremiumStatus(true)` to simulate purchase completion
5. Close PaywallDrawer
6. Re-open template browser drawer
7. **Expected:** Premium templates are now unlocked (no lock icons)

### 5. Existing manual create flow unchanged

1. Open Programs page
2. Tap the primary "Neues Programm" / "Create Program" FAB
3. **Expected:** Manual program creation flow works exactly as before — no regressions

### 6. Onboarding templates unaffected

1. Clear app data / reset onboarding state
2. Go through onboarding flow
3. **Expected:** Only 3 free templates shown (PPL, Upper/Lower, Full Body). No premium templates visible.

## Edge Cases

### Double-tap prevention during creation

1. Open template browser drawer
2. Rapidly tap a free template twice
3. **Expected:** Only one program is created. Second tap should be blocked by loading state (spinner on card).

### Template data integrity (automated)

1. Run `cd apps/mobile && pnpm test`
2. **Expected:** 428+ tests pass including all premium template integrity checks (exercise names, rep ranges, day counts, unique IDs)

## Failure Signals

- Lock icons missing on premium templates when user is not premium
- PaywallDrawer not opening when tapping a locked premium template
- Premium templates visible in onboarding flow
- Template creation fails with "exercise not found" error (exercise name mismatch with seed data)
- `PROGRAM_TEMPLATES` count !== 3 (would break onboarding)
- i18n keys missing: raw key strings like `programs_template_button` visible in UI instead of translated text
- de.json and en.json key count mismatch

## Requirements Proved By This UAT

- R021 (Premium Program Templates) — Templates are browsable, gated, and usable for program creation after purchase
- R023 (Paywall UX & Upgrade Flows) — PaywallDrawer surfaces correctly from template browsing context

## Not Proven By This UAT

- Real native IAP purchase flow (requires device + sandbox — S06 scope)
- Server-side purchase validation (M004 scope)
- Store listing descriptions referencing premium templates (S05 scope)
- Localization in es/fr/it locales (S07 scope)

## Notes for Tester

- Use `setPremiumStatus(true/false)` in browser console to toggle premium state for testing without native IAP
- Template names are in English (by design — D085). UI chrome (headers, badges, buttons) should be in the current locale
- The "From Template" button uses outline variant to visually distinguish from the primary "Create Program" button
- programs_template_creating key exists but is unused — not a bug

# S07: i18n — German & English for Analytics UI — Research

**Date:** 2026-03-12

## Summary

S07 is a pure i18n synchronization slice. All M002 analytics components (S02–S06) already use paraglide `m.*()` calls for user-facing strings — no hardcoded untranslated text exists in the template markup. The German base locale (`de.json`) has all 74 analytics-related keys defined. The problem is straightforward: **41 keys in `de.json` have no corresponding entry in `en.json`**. These cover PR celebrations (13 keys), PR detail view (10 keys), PR history (13 keys), progression banners (5 keys), and deload banners (4 keys). The `analytics_*` and `premium_*` keys are already synchronized across both locales.

A secondary issue exists: **4 M002 components have hardcoded `'de-DE'` locale strings** in `Intl.DateTimeFormat` and `toLocaleDateString()` calls. These should use the paraglide `getLocale()` function to format dates according to the active locale. This is a locale-aware formatting fix, not an i18n key issue — 3 chart axis formatters (StrengthChart, VolumeChart, BodyWeightChart) and 1 date formatter (PRHistoryCard) need the fix.

No new keys need to be created — all required keys already exist in `de.json`. The work is: (1) add English translations for the 41 missing keys in `en.json`, (2) fix 4 hardcoded `'de-DE'` locale references, (3) verify zero key drift.

## Recommendation

**Split into two focused tasks:**

1. **T01: Add 41 missing English translations to `en.json`** — Translate all PR, progression, and deload keys from German to English. Verify key counts match afterward. This is the bulk of the work.

2. **T02: Fix hardcoded `'de-DE'` locale in 4 M002 components** — Replace hardcoded `'de-DE'` with a locale-aware approach using paraglide's `getLocale()`. Map `de` → `de-DE`, `en` → `en-US` for `Intl.DateTimeFormat` and `toLocaleDateString()` calls. Run `pnpm run build` to verify.

Keep these separate because T01 is pure JSON editing while T02 involves Svelte component changes. Both are low-risk.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| i18n message function generation | Paraglide (already configured) | Compiles `de.json`/`en.json` into typed `m.*()` functions. Run `pnpm paraglide:compile` if needed. |
| Locale-aware date formatting | `getLocale()` from `$lib/paraglide/runtime.js` + `Intl.DateTimeFormat` | Already used in `settings/+page.svelte`. Map paraglide locale tag to BCP 47 for `Intl` APIs. |
| Locale detection | Paraglide's `["localStorage", "preferredLanguage", "baseLocale"]` strategy (D040) | Already configured for Capacitor SPA. No changes needed. |

## Existing Code and Patterns

- `apps/mobile/messages/de.json` (319 keys) — **Source of truth.** All 74 analytics keys present and correct. Base locale per project config.
- `apps/mobile/messages/en.json` (278 keys) — **41 keys short.** Missing all S03 (PR celebration/detail/history), S04 (progression banner), and S05 (deload banner) translations. S02 (analytics dashboard/charts) and S06 (premium/upgrade) keys are already translated.
- `apps/mobile/src/routes/settings/+page.svelte:3` — Uses `getLocale()` / `setLocale()` from `$lib/paraglide/runtime.js`. Pattern to follow for locale-aware formatting.
- `apps/mobile/src/lib/components/analytics/StrengthChart.svelte:58` — Hardcoded `'de-DE'` in `toLocaleDateString()`. Same pattern in VolumeChart (line 60) and BodyWeightChart (line 65).
- `apps/mobile/src/lib/components/history/PRHistoryCard.svelte:24` — Hardcoded `'de-DE'` in `new Intl.DateTimeFormat()`.
- `apps/mobile/src/lib/paraglide/runtime.js:209` — Exports `getLocale()` returning `"de"` or `"en"`. Needs mapping to BCP 47 tags (`de-DE`, `en-US`) for `Intl` APIs.

**Note:** 3 additional M001 components (`BodyWeightList`, `SessionCard`, `SessionDetail`) also have hardcoded `'de-DE'` but are out of scope for this slice — they predate M002.

## Constraints

- **Base locale is `de`, not `en`** — All new keys must already exist in `de.json` before adding to `en.json`. Currently satisfied — no new keys needed.
- **Parameter names must match exactly** — e.g., `{suggestedWeight}`, `{increment}`, `{count}`, `{value}`, `{week}`, `{date}`, `{avgRir}`, `{sessions}`, `{weight}`. English translations must use identical parameter names.
- **Only 2 locales configured** — `de` and `en` in `project.inlang/settings.json`. No es/fr/it files exist. AGENTS.md mentions them but they're not in scope for this project's current config.
- **Paraglide generates fallback re-exports for missing en keys** — When a key exists in `de.json` but not `en.json`, the generated `en.js` re-exports from `de.js`. This means English users currently see German text for the 41 missing keys — a real user-facing bug.
- **`pnpm paraglide:compile` regenerates `src/lib/paraglide/`** — After editing JSON, compile to update generated code. Per AGENTS.md: trust that keys will work at next build; don't over-verify generated output.

## Common Pitfalls

- **Parameter name mismatches** — If `en.json` uses `{number}` where `de.json` uses `{count}`, paraglide compile will fail or produce wrong output. Cross-reference each key's parameters carefully.
- **Stale paraglide output masking issues** — The generated `en.js` re-exports missing keys from `de.js`, so code compiles even with missing translations. Always verify by checking `en.json` key count matches `de.json`, not by checking build success.
- **Locale tag format mismatch** — Paraglide uses short tags (`de`, `en`) but `Intl.DateTimeFormat` expects BCP 47 (`de-DE`, `en-US`). A simple mapping function or object is needed.
- **German umlauts and special characters** — The German translations use proper umlauts (ä, ö, ü, ß). English translations obviously don't need these, but verify the German originals are correct as-is.

## Open Risks

- **None significant.** This is a low-risk i18n sync task. All components already use `m.*()` calls. The only code changes are JSON additions and 4 locale string fixes. Build verification catches any parameter mismatches.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Paraglide | (already in codebase and references) | installed |

No additional skills needed for this slice — it's pure translation work plus minor locale formatting fixes.

## Sources

- `apps/mobile/messages/de.json` — 319 keys, all analytics keys present (source of truth)
- `apps/mobile/messages/en.json` — 278 keys, 41 analytics keys missing
- Component audit — all 14 M002 `.svelte` files confirmed to use `m.*()` imports, no hardcoded UI text
- `apps/mobile/project.inlang/settings.json` — confirms `baseLocale: "de"`, `locales: ["de", "en"]`
- D040 — Paraglide locale strategy for Capacitor SPA

## Key Inventory: Missing en.json Translations

### Deload Banner (4 keys)
| Key | de.json value | Parameters |
|-----|---------------|------------|
| `deload_banner_title` | Deload-Woche | — |
| `deload_banner_description` | Gewichte auf ~60% reduziert. Fokus auf Erholung und Technik. | — |
| `deload_banner_week` | Woche {week} | `{week}` |
| `deload_banner_dismiss` | Deload-Hinweis schließen | — |

### PR Celebration Toast (10 keys)
| Key | de.json value | Parameters |
|-----|---------------|------------|
| `pr_celebration_title_singular` | Neuer Rekord! | — |
| `pr_celebration_title_plural` | Neue Rekorde! ({count}) | `{count}` |
| `pr_celebration_weight_pr` | Gewichts-PR | — |
| `pr_celebration_rep_pr` | Wiederholungs-PR | — |
| `pr_celebration_e1rm_pr` | 1RM-PR | — |
| `pr_celebration_value_kg` | {value} kg | `{value}` |
| `pr_celebration_value_reps` | {value} Wdh. | `{value}` |
| `pr_celebration_value_e1rm` | ~{value} kg (gesch. 1RM) | `{value}` |
| `pr_celebration_more` | +{count} weitere | `{count}` |

### PR Detail / ExercisePRSection (10 keys)
| Key | de.json value | Parameters |
|-----|---------------|------------|
| `pr_detail_title` | Persönliche Rekorde | — |
| `pr_detail_no_records` | Noch keine Rekorde | — |
| `pr_detail_weight_pr` | Bestes Gewicht | — |
| `pr_detail_rep_pr` | Beste Wiederholungen | — |
| `pr_detail_e1rm_pr` | Bester gesch. 1RM | — |
| `pr_detail_kg_value` | {value} kg | `{value}` |
| `pr_detail_reps_value` | {value} Wdh. | `{value}` |
| `pr_detail_e1rm_value` | ~{value} kg | `{value}` |
| `pr_detail_at_weight` | bei {weight} kg | `{weight}` |
| `pr_detail_loading` | Rekorde laden... | — |

### PR History (13 keys)
| Key | de.json value | Parameters |
|-----|---------------|------------|
| `pr_history_title` | Persönliche Rekorde | — |
| `pr_history_loading` | Rekorde werden geladen... | — |
| `pr_history_empty_title` | Noch keine Rekorde | — |
| `pr_history_empty_description` | Schliesse Trainingseinheiten ab, um deine Rekorde zu sehen. | — |
| `pr_history_weight_pr` | Gewicht | — |
| `pr_history_rep_pr` | Wiederholungen | — |
| `pr_history_e1rm_pr` | Gesch. 1RM | — |
| `pr_history_kg_value` | {value} kg | `{value}` |
| `pr_history_reps_value` | {value} Wdh. | `{value}` |
| `pr_history_e1rm_value` | ~{value} kg | `{value}` |
| `pr_history_date_label` | am {date} | `{date}` |
| `pr_history_show_all` | Alle anzeigen | — |
| `pr_history_current_best` | Aktueller Bestwert | — |

### Progression Banner (4 keys)
| Key | de.json value | Parameters |
|-----|---------------|------------|
| `progression_banner_title` | Progression vorgeschlagen | — |
| `progression_banner_message` | Erhöhe auf {suggestedWeight} kg (+{increment} kg) | `{suggestedWeight}`, `{increment}` |
| `progression_banner_reason` | Durchschnittliches RIR von {avgRir} über {sessions} Einheiten | `{avgRir}`, `{sessions}` |
| `progression_banner_dismiss` | Ausblenden | — |
| `progression_banner_sessions_analyzed` | {sessions} Einheiten analysiert | `{sessions}` |

### Hardcoded Locale Fixes (4 files)
| File | Line | Current | Fix |
|------|------|---------|-----|
| `StrengthChart.svelte` | 58 | `'de-DE'` | Use `getLocale()` mapped to BCP 47 |
| `VolumeChart.svelte` | 60 | `'de-DE'` | Use `getLocale()` mapped to BCP 47 |
| `BodyWeightChart.svelte` | 65 | `'de-DE'` | Use `getLocale()` mapped to BCP 47 |
| `PRHistoryCard.svelte` | 24 | `'de-DE'` | Use `getLocale()` mapped to BCP 47 |

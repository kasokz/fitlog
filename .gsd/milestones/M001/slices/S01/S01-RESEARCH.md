# S01: Data Layer & Exercise Library — Research

**Date:** 2026-03-12

## Summary

S01 is the foundation slice — it establishes the SQLite data layer, repository pattern, exercise types, curated seed data, and exercise browse/search/filter UI. Every subsequent slice depends on this. The primary risk is getting the `@capgo/capacitor-fast-sql` integration right: connection lifecycle, schema migration, and a thin-but-effective repository abstraction that keeps raw SQL manageable.

The project already has a mature monorepo (`pnpm` + Turborepo), a full neobrutalist design system in `@repo/ui` (56+ shadcn-svelte components including `command`, `empty`, `form`, `badge`, `card`, `input`, `tabs`, `dialog`, `drawer`, `sheet`), Paraglide i18n wired, and ModeWatcher for dark/light mode. The mobile app shell exists at `apps/mobile/` with SvelteKit static adapter, SSR disabled, and Capacitor 8 config. No native projects (ios/android) are scaffolded yet — that's S06 scope.

The critical decision to surface: D001 says "capacitor-community/sqlite" but the references directory contains `@capgo/capacitor-fast-sql` v8.0.23 — a higher-performance alternative from the same Capgo team that uses a local HTTP server to bypass Capacitor's bridge serialization overhead. The `FastSQL` class + `SQLConnection` API is significantly cleaner than capacitor-community/sqlite's verbose connection management. We should use `@capgo/capacitor-fast-sql` and amend D001 accordingly.

## Recommendation

**Use `@capgo/capacitor-fast-sql` with a thin repository pattern over raw SQL.**

- `FastSQL.connect()` returns a `SQLConnection` with `query()`, `run()`, `executeBatch()`, and `transaction()` — clean enough that a heavy ORM (drizzle) adds complexity without payoff at this stage.
- Build a `database.ts` module that manages the singleton connection, runs schema migrations on first open, and exposes the connection for repositories.
- Each domain entity gets a repository class (starting with `ExerciseRepository`) that encapsulates SQL queries and returns typed objects.
- Schema uses UUID PKs (`crypto.randomUUID()`), `created_at`/`updated_at` ISO timestamps, and `deleted_at` for soft delete (per D002).
- Zod v4 schemas validate data at repository boundaries (insert/update).
- Superforms in SPA mode for the custom exercise creation form (form component extracted per AGENTS.md rules).

For the exercise UI: use the existing `Command` component for search, `Badge` for muscle group/equipment tags, `Card` for exercise items, `Tabs` for category filtering, and `Empty` for zero-state. This leverages the design system fully.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| SQLite access on Capacitor | `@capgo/capacitor-fast-sql` (v8, in references) | HTTP-based protocol bypasses bridge serialization; `FastSQL` + `SQLConnection` API is clean; web fallback via sql.js + IndexedDB |
| Form validation | `sveltekit-superforms` v2.30.0 + `zod4` adapter | Already in UI package deps; SPA mode works without server actions; formsnap components already in `@repo/ui/form` |
| Schema validation | `zod` v4.3.6 (already installed) | Use `z.uuidv4()`, `z.int()`, `z.enum()`, `z.iso.datetime()` — Zod 4 syntax per AGENTS.md |
| Search debouncing | `runed` `Debounced` utility | Already in deps; Svelte 5 rune-native |
| Conditional class names | `cn()` from `@repo/ui/utils` | Already available; uses `clsx` + `tailwind-merge` |
| UUID generation | `crypto.randomUUID()` | Built-in, works offline, no deps needed |
| i18n | Paraglide (already wired) | `m.key()` pattern already used in `+page.svelte` |

## Existing Code and Patterns

- `apps/mobile/src/routes/+layout.ts` — `export const ssr = false;` — confirms SPA mode, no server-side rendering
- `apps/mobile/src/routes/+layout.svelte` — Imports `@repo/ui/globals.css`, wraps in `ModeWatcher` + flex layout
- `apps/mobile/src/routes/+page.svelte` — Uses `m.app_title()` pattern for i18n; this is the entry point to replace with exercise library
- `apps/mobile/src/hooks.ts` — Paraglide `reroute` for delocalized URLs
- `apps/mobile/src/hooks.server.ts` — Paraglide middleware for locale detection (runs even in SPA via adapter-static)
- `apps/mobile/capacitor.config.ts` — Needs `appId`/`appName` update (currently `com.example.myapp`); `webDir: 'build'` is correct for static adapter
- `apps/mobile/vite.config.ts` — Paraglide vite plugin, enhanced images, tailwindcss, git version define
- `packages/ui/src/components/ui/form/` — Full formsnap integration (Field, Control, Label, FieldErrors, Button, etc.) using superforms
- `packages/ui/src/components/ui/command/` — Search/command palette component (CommandInput, CommandList, CommandItem, CommandEmpty, etc.)
- `packages/ui/src/components/ui/empty/` — Empty state component (EmptyMedia, EmptyTitle, EmptyDescription)
- `packages/ui/src/components/ui/badge/` — Badge with variants (default, secondary, destructive, outline)
- `packages/ui/src/components/ui/card/` — Card component for exercise items
- `packages/ui/src/components/ui/tabs/` — Tabs for filtering categories
- `packages/ui/src/components/ui/drawer/` — Drawer for mobile-friendly exercise detail/creation
- `packages/ui/src/components/ui/sheet/` — Sheet for slide-in panels
- `packages/ui/src/globals.css` — Full neobrutalist theme with oklch colors, hard shadows (`--radius: 0.125rem`), safe-area utilities, dark mode tokens
- `references/capacitor-fast-sql/` — Full source of `@capgo/capacitor-fast-sql` v8.0.23 with `FastSQL`, `SQLConnection`, `KeyValueStore` classes
- `references/capacitor-fast-sql/src/sql-connection.ts` — `query()`, `run()`, `executeBatch()`, `transaction()`, `beginTransaction()`/`commit()`/`rollback()`
- `references/capacitor-fast-sql/src/fast-sql.ts` — `FastSQL.connect()`, `FastSQL.disconnect()`, `FastSQL.getConnection()` — singleton connection manager
- `references/capacitor-fast-sql/src/web.ts` — Web fallback using sql.js loaded from CDN + IndexedDB persistence

## Constraints

- **`@capgo/capacitor-fast-sql` not yet installed** — Must `pnpm add -D @capgo/capacitor-fast-sql` in `apps/mobile/`. The web implementation loads sql.js from CDN — fine for dev but needs consideration for offline web testing.
- **No native projects exist** — `ios/` and `android/` directories don't exist yet. During S01, we can only test in the browser via the sql.js web fallback. Native SQLite testing is S06 scope. The web implementation uses IndexedDB for persistence — sufficient to prove the data layer works.
- **iOS requires `NSAllowsLocalNetworking` in Info.plist** — The plugin's HTTP server needs localhost cleartext. Must be configured when native projects are scaffolded (S06).
- **Android requires `network_security_config.xml`** — Same reason — localhost cleartext for the HTTP server. S06 scope.
- **SSR is disabled** (`ssr = false`) — All code runs client-side only. No `+page.server.ts` load functions. Superforms must use SPA mode with `validators` (client-side validation only).
- **Zod v4 syntax required** — Use `z.uuidv4()` not `z.string().uuid()`, `z.int()` not `z.number().int()`, `z.iso.datetime()` not `z.string().datetime()`. Import adapter as `zod4` and `zod4Client` from `sveltekit-superforms/adapters/zod4`.
- **AGENTS.md: superforms adapter** — Must use `zod4` and `zod4Client` (not `zod`/`zodClient`). Import from `sveltekit-superforms/adapters/zod4`.
- **AGENTS.md: forms in own components** — All forms must be extracted into dedicated components, even if used once. No inline forms.
- **i18n: `de.json` is stated source of truth** in AGENTS.md, but `project.inlang/settings.json` has `"baseLocale": "en"`. The `baseLocale` in inlang config determines which messages file is the fallback. AGENTS.md says de is source of truth for *translation management* but inlang is technically configured with en as baseLocale. This discrepancy must be respected as-is (follow AGENTS.md for key management; follow inlang config for technical behavior).
- **SvelteKit static adapter** with `fallback: "index.html"` — Client-side routing works, but all routes must exist as SvelteKit routes (not just dynamic segments with no `+page.svelte`).
- **pnpm only** — Never use npm.
- **Svelte 5 runes only** — `$state()`, `$derived()`, `$effect()`, `$props()`, `$bindable()`. No stores, no `$:` reactive statements.
- **Icons from `@lucide/svelte`** — Not `lucide-svelte`.

## Common Pitfalls

- **`FastSQL.connect()` must be called before any DB operation** — The connection is async and returns a `SQLConnection`. Need a reliable initialization pattern that runs once before any repository is used. Best approach: a `getDb()` function that lazily initializes and caches the connection, called at the top of each repository method.
- **Web fallback loads sql.js from CDN** — In dev mode (browser), the web implementation fetches sql.js from `cdnjs.cloudflare.com`. This means: (a) first load needs network, (b) if CDN is down, dev breaks. Consider that for dev experience but don't over-engineer — native is the real target.
- **`executeBatch()` for seed data** — Inserting ~100 exercises one-by-one would be slow. Use `executeBatch()` to batch all seed inserts in a single round-trip within a transaction.
- **Schema migration strategy** — No built-in migration system. Use a `schema_version` table and manual version checks on connect. For S01, version 1 is sufficient; keep it simple with a single `schema.sql` that creates all tables. Future slices add tables by incrementing the version and adding migration SQL.
- **UUID PKs are strings in SQLite** — SQLite has no native UUID type. Store as TEXT. `crypto.randomUUID()` returns a v4 UUID string.
- **Timestamps as ISO strings** — SQLite has no native datetime. Store as TEXT in ISO 8601 format (`new Date().toISOString()`). Query with string comparison (works for ISO format).
- **Soft delete filtering** — Every query must include `WHERE deleted_at IS NULL` unless explicitly querying deleted records. Easy to forget. Repositories should add this by default.
- **SPA superforms pattern** — In SPA mode, `superForm()` needs `SPA: true` and `validators: zod4Client(schema)`. The `onUpdate` callback handles the submit logic (call repository, show toast, etc.). No server action.
- **Form component extraction** — Per AGENTS.md, even the custom exercise creation form must be its own component file (e.g., `ExerciseForm.svelte`), not inlined in a page.
- **i18n key management** — Add `de.json` keys first for all new UI strings, then `en.json` translations. Both must stay in sync. Don't add English-only keys.

## Open Risks

- **`@capgo/capacitor-fast-sql` web fallback maturity** — The web implementation loads sql.js v1.8.0 from CDN and uses IndexedDB for persistence. This is the dev/testing story for S01 since no native projects exist yet. If the web fallback has issues (e.g., sql.js CDN load failure, IndexedDB quota), dev experience suffers. Mitigation: test early, have a local sql.js fallback plan.
- **D001 amendment needed** — The decisions register says "capacitor-community/sqlite" but we're using `@capgo/capacitor-fast-sql`. Must add a new decision row superseding D001 during execution to keep the register accurate.
- **Exercise seed data volume** — ~100 curated exercises with muscle groups, equipment, and descriptions. Manual curation is time-consuming but ensures quality. Risk: takes longer than estimated. Mitigation: start with ~50 core exercises, expand if time allows.
- **Search performance on web fallback** — sql.js is single-threaded WebAssembly. Full-text search on 100 exercises should be fine, but `LIKE` queries in sql.js may behave differently than native SQLite. Test early.
- **Paraglide locale config discrepancy** — `project.inlang/settings.json` has `"baseLocale": "en"` but AGENTS.md insists de is base. This could cause confusion during i18n work. For S01, just ensure both de.json and en.json have all keys for new UI strings.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Capacitor plugins | `cap-go/capacitor-skills@capacitor-plugins` (123 installs) | available — directly relevant for capacitor-fast-sql plugin usage patterns |
| SvelteKit | `spences10/svelte-skills-kit@sveltekit-structure` (266 installs) | available — potentially useful for project structure patterns |
| SvelteKit | `claude-skills/sveltekit-svelte5-tailwind-skill@sveltekit-svelte5-tailwind-skill` (119 installs) | available — Svelte 5 + Tailwind patterns |

**Note:** The project already has comprehensive local references for all key technologies (Svelte, SvelteKit, Zod, shadcn-svelte, runed, Capacitor, etc.) in the `references/` directory. The local `capacitor-fast-sql` reference is the most critical source of truth — it contains the full source code including architecture docs, API definitions, and web fallback implementation. External skills are supplementary.

## Sources

- `@capgo/capacitor-fast-sql` API — `FastSQL.connect()`, `SQLConnection.query()/run()/executeBatch()/transaction()` (source: `references/capacitor-fast-sql/src/`)
- `@capgo/capacitor-fast-sql` architecture — HTTP-based protocol bypassing Capacitor bridge, local HTTP server on localhost (source: `references/capacitor-fast-sql/ARCHITECTURE.md`)
- `@capgo/capacitor-fast-sql` setup — iOS needs `NSAllowsLocalNetworking`, Android needs `network_security_config.xml` (source: `references/capacitor-fast-sql/SETUP.md`)
- Web fallback implementation — sql.js v1.8.0 from CDN + IndexedDB persistence (source: `references/capacitor-fast-sql/src/web.ts`)
- Zod v4 API — `z.uuidv4()`, `z.int()`, `z.enum()`, `z.iso.datetime()`, `z.iso.date()` (source: `references/zod/packages/docs/content/v4/index.mdx`)
- Superforms zod4 adapter — `zod` and `zodClient` exports from `sveltekit-superforms/adapters/zod4`, works with `$ZodType` from `zod/v4/core` (source: `packages/ui/node_modules/sveltekit-superforms/dist/adapters/zod4.d.ts`)
- shadcn-svelte form components — formsnap-based Field, Control, Label, FieldErrors, Button components (source: `packages/ui/src/components/ui/form/`)
- runed utilities — `Debounced`, `Context`, `PersistedState` available (source: `references/runed/packages/runed/src/lib/utilities/`)
- Neobrutalist design tokens — oklch palette, `--radius: 0.125rem`, hard shadow system with 2-3px offsets (source: `packages/ui/src/globals.css`)

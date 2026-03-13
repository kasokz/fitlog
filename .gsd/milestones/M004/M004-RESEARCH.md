# M004: Cloud Sync & Platform — Research

**Date:** 2026-03-13

## Summary

M004 connects a mature offline-first mobile app to the cloud. The existing data model (UUID PKs, timestamps, soft delete across 8 tables) was designed for this from M001. The core challenge isn't schema — it's choosing the right sync engine and wiring auth + backend + sync service together without disrupting 428 passing tests and a working app.

**Primary recommendation: PowerSync (self-hosted) + Better Auth + Drizzle ORM + custom SvelteKit API backend on the existing `apps/web` scaffold.** PowerSync is purpose-built for offline-first SQLite sync and has a dedicated `@powersync/capacitor` SDK. It handles conflict resolution (last-write-wins per field by default, customizable), incremental sync, and offline queuing — exactly the hard problems we'd otherwise hand-roll. Better Auth provides cookie/bearer-based auth with SvelteKit integration. The `apps/web` app already uses `@sveltejs/adapter-node` and can serve as the API server. A proven production reference app (`references/capacitor-live-updates`) uses this exact stack (Better Auth + Drizzle + SvelteKit + adapter-node) and validates the approach.

The main risk is the **client-side database migration**: PowerSync replaces `@capgo/capacitor-fast-sql` as the SQLite layer. It uses its own internal table structure (`ps_data__<table>` + views) and manages its own DB file. This means every repository's `dbExecute`/`dbQuery` calls must be adapted to PowerSync's `db.execute()`/`db.getAll()`. The SQL itself stays the same — the interface change is mechanical. But the test infrastructure (sql.js mock of `@capgo/capacitor-fast-sql`) needs a corresponding rewrite. This is the highest-risk slice and should go first.

Data export (CSV/JSON) is the simplest requirement — pure client-side feature reading from the local DB, no server dependency. Backup/restore can piggyback on the sync infrastructure (full sync = backup; sync to new device = restore).

## Recommendation

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Mobile App      │────▶│  SvelteKit API   │────▶│  PostgreSQL     │
│  (Capacitor)     │     │  (apps/web)      │     │  (source DB)    │
│                  │     │  - Better Auth   │     │                 │
│  @powersync/     │     │  - Drizzle ORM   │     │  user_id on     │
│  capacitor       │     │  - CRUD API      │     │  all tables     │
│                  │     │  - JWT/JWKS      │     │                 │
│  Local SQLite    │     └──────────────────┘     └────────┬────────┘
│  (PowerSync      │                                       │
│   managed)       │     ┌──────────────────┐              │ replication
│                  │◀───▶│  PowerSync       │◀─────────────┘
│                  │     │  Service (Docker) │
└─────────────────┘     │  - Sync rules    │
                         │  - JWKS verify   │
                         └──────────────────┘
```

**Data flow:**
1. Client writes to local SQLite via PowerSync SDK → queued in `ps_crud`
2. PowerSync SDK uploads CRUD ops to SvelteKit API (via `uploadData` connector)
3. API validates + writes to Postgres via Drizzle ORM
4. PowerSync Service detects Postgres changes via replication
5. Service pushes changes to connected clients via sync rules (filtered by `user_id`)

**Auth flow:**
1. User signs up/in via Better Auth endpoints on SvelteKit API
2. API returns Bearer token (via Better Auth Bearer plugin), stored in `@capacitor/preferences`
3. Better Auth JWT plugin issues JWTs, exposes JWKS at `/api/auth/jwks`
4. Mobile passes JWT to PowerSync connector's `fetchCredentials()`
5. PowerSync Service validates JWT against Better Auth's JWKS endpoint

### Why this stack

- **PowerSync** eliminates hand-rolling sync protocol, conflict resolution, offline queue, and incremental delta sync. Self-hosted Open Edition is free, production-stable, same codebase as cloud version.
- **Better Auth** provides JWT + JWKS (which PowerSync needs), Bearer token plugin for mobile API auth, SvelteKit integration, and email/password auth. 21.9K-install agent skill available. **Proven in production** in the `references/capacitor-live-updates` reference app.
- **Drizzle ORM** for server-side Postgres — type-safe queries, schema generation, migration tooling. **Already proven** in the reference app with Better Auth adapter.
- **SvelteKit `apps/web`** already exists with `adapter-node`, same monorepo, same UI framework. Adding API routes is natural. Reference app demonstrates the exact pattern (hooks.server.ts → auth middleware → API routes → Drizzle queries).
- **PostgreSQL** is the standard backend for PowerSync. Better Auth + Drizzle support it natively.

### Why NOT alternatives

- **Custom REST sync**: Would require hand-rolling conflict resolution, change tracking, delta sync, offline queue, retry logic — exactly what PowerSync solves. Months of work vs. weeks of integration.
- **ElectricSQL**: Doesn't handle client-side persistence — developers must implement their own. PowerSync manages the full SQLite lifecycle.
- **Supabase**: Ruled out per user direction. Building our own backend.
- **Lucia Auth**: Deprecated by its creator. Better Auth is its spiritual successor with more features.

### Reference App Patterns to Reuse

The `references/capacitor-live-updates` production app demonstrates these exact patterns:

| Pattern | Reference File | Apply To |
|---------|---------------|----------|
| Better Auth server setup (minimal bundle, Drizzle adapter, `sveltekitCookies`) | `src/lib/server/auth.ts` | `apps/web/src/lib/server/auth.ts` |
| Auth client (one-liner) | `src/lib/auth-client.ts` | Mobile auth client |
| Drizzle DB singleton with `building` guard | `src/lib/server/db/index.ts` | `apps/web/src/lib/server/db/index.ts` |
| Auto-generated auth schema (user, session, account, verification) | `src/lib/server/db/auth.schema.ts` | Run `better-auth generate` |
| Hooks.server.ts with auth middleware + API key auth | `src/hooks.server.ts` | `apps/web/src/hooks.server.ts` |
| `requireUserId()` central auth check | `src/lib/server/auth.ts` | All API route handlers |
| `AppError` class + `resolveError()` for API errors | `src/lib/server/error.ts` | API error handling |
| Dashboard auth guard via layout server load | `src/routes/(dashboard)/+layout.server.ts` | Protected routes |
| API routes with Drizzle queries | `src/routes/api/**` | CRUD API for sync |
| Drizzle config for postgres | `drizzle.config.ts` | `apps/web/drizzle.config.ts` |
| Seed script with `hashPassword` from `better-auth/crypto` | `scripts/seed.ts` | Admin/test user seeding |
| `app.d.ts` locals typing | `src/app.d.ts` | Type `user`, `session`, `apiKeyUserId` on `event.locals` |

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Offline-first SQLite sync with conflict resolution | PowerSync (`@powersync/capacitor`) | Purpose-built for this exact problem. Handles CRDT-like sync, offline queue, incremental delta, reconnect. Self-hostable, free Open Edition. |
| Authentication + JWT/JWKS | Better Auth (`better-auth`) with JWT + Bearer plugins | Provides JWKS endpoint for PowerSync, Bearer tokens for mobile, SvelteKit hooks integration. Production-proven in reference app. |
| Server-side DB + migrations | Drizzle ORM (`drizzle-orm` + `drizzle-kit`) | Type-safe queries, auto-generates Better Auth schema, push/generate/migrate workflow. Reference app pattern. |
| Client-side data export (CSV) | Manual CSV generation with template strings | Simple enough to hand-roll. No library needed for JSON export. |

## Existing Code and Patterns

- `apps/mobile/src/lib/db/database.ts` — Singleton DB connection manager. Exposes `dbExecute()`, `dbQuery()`, `getDb()`. **Must be replaced** with PowerSync DB instance. The thin wrapper pattern is ideal — only this file + 5 repositories + 3 other imports need changing.
- `apps/mobile/src/lib/db/schema.sql` — Schema v5 with 8 tables. All have UUID PKs, `created_at`, `updated_at`, `deleted_at`. **Directly translatable** to PowerSync client-side schema definition AND to Drizzle server-side schema. No `user_id` columns needed client-side (sync rules handle user isolation server-side).
- `apps/mobile/src/lib/db/repositories/*.ts` — 5 repositories (exercise, program, workout, bodyweight, analytics) totaling 1838 lines. Use raw SQL via `dbExecute`/`dbQuery`. SQL stays the same; only the DB access functions change.
- `apps/mobile/src/lib/db/__tests__/test-helpers.ts` — Mocks `@capgo/capacitor-fast-sql` with sql.js in-memory DB. **Must be rewritten** to mock PowerSync's API. 428 tests depend on this.
- `apps/mobile/src/lib/services/premium.ts` — Uses `@capacitor/preferences` for state persistence. **Same pattern** should be used for auth token storage (Bearer token from Better Auth).
- `apps/web/` — SvelteKit scaffold with `adapter-node`. Has paraglide i18n, shared UI package. **Becomes the API server.** Currently just a landing page — needs API routes, Better Auth setup, Drizzle + Postgres connection.
- `apps/mobile/capacitor.config.ts` — Already has `CapacitorUpdater` config stub. PowerSync Capacitor plugin will need to be registered here.
- `references/capacitor-live-updates/` — **Production reference app** with Better Auth + Drizzle + SvelteKit + adapter-node. Source of truth for auth patterns, DB setup, API route structure, error handling, hooks middleware.

## Constraints

- **PowerSync replaces the SQLite layer entirely.** Cannot run `@capgo/capacitor-fast-sql` and `@powersync/capacitor` side by side on the same DB. Migration is all-or-nothing for the DB layer.
- **Existing data migration.** Users upgrading from pre-sync versions have data in the old `@capgo/capacitor-fast-sql` DB. Need a one-time migration to copy data into PowerSync's managed DB on first launch after update. PowerSync supports local-only mode (no `connect()`) for this.
- **PowerSync Capacitor SDK uses `capacitor-community/sqlite` internally** on native, not `@capgo/capacitor-fast-sql`. These are different plugins. The migration swaps the underlying SQLite plugin.
- **Server-side tables need `user_id` columns.** Client-side schema does NOT need them — PowerSync sync rules filter by `request.user_id()`. But the Postgres tables must have `user_id` on every user-data table for RLS and sync rule filtering.
- **`exercises` table is special.** Seed exercises are shared across all users (not user-owned). Custom exercises are user-owned. Need a hybrid approach: shared seed data + per-user custom exercises. Sync rules must handle this.
- **No `@capgo/capacitor-fast-sql` web fallback** — PowerSync Web SDK provides its own web fallback, so the existing sql.js fallback from capgo is replaced.
- **Better Auth needs a Postgres instance.** Can share the same Postgres as the app data. Better Auth auto-generates its own tables (`user`, `session`, `account`, `verification`) via `better-auth generate` CLI.
- **PowerSync Service needs Docker.** Self-hosted via `journeyapps/powersync-service:latest`. Needs access to the Postgres instance via replication connection.
- **428 existing tests** depend on the `@capgo/capacitor-fast-sql` mock. All must pass after migration.
- **SvelteKit experimental flags** — Reference app uses `remoteFunctions: true` and `experimental.async: true` in svelte.config.js for `command()`/`query()` from `$app/server`. These are SvelteKit experimental features that may change.
- **`building` guard required** — Better Auth and Drizzle DB initialization must be guarded with `import { building } from '$app/environment'` to avoid crashes during SvelteKit build (no env vars available at build time). Reference app demonstrates this pattern.

## Common Pitfalls

- **Migrating the DB layer mid-feature** — Swapping SQLite plugins affects every data path in the app. Do this as a dedicated slice BEFORE adding sync, auth, or any new features. Prove the app works identically with PowerSync in local-only mode first.
- **Trying to keep both SQLite plugins** — Two native SQLite plugins will conflict. PowerSync must be the sole SQLite layer. Clean cut.
- **Forgetting existing user data migration** — Users who update the app have data in the old DB file. A migration service must detect the old DB, read all data, write it into PowerSync's new DB, then delete the old DB. Test this explicitly.
- **Auth token expiry during long offline periods** — User goes offline for days, token expires, reconnects. The PowerSync connector's `fetchCredentials()` must handle token refresh. Better Auth's session refresh mechanism needs to work even after extended offline periods.
- **Sync rules too broad** — If sync rules select `*` without user filtering, every user gets every user's data. Always filter by `bucket.user_id = request.user_id()`.
- **Not handling the "no account yet" state** — App currently works without any account. Users must be able to continue using it offline without signing up. Signing up should trigger initial upload of all local data. PowerSync's local-only mode handles this — don't call `connect()` until the user has an account.
- **Soft-delete sync semantics** — PowerSync default: "deletes always win." The app uses soft-delete (`deleted_at` timestamp). The `uploadData` connector must translate PowerSync DELETE operations into soft-delete UPDATEs on the server, not hard deletes. Otherwise data loss.
- **Exercise seed data duplication** — When a new user signs up and syncs, they'll get seed exercises from the server AND have locally-seeded exercises. Need deduplication strategy (match on name or use stable UUIDs for seed exercises).
- **Missing `building` guard** — If Better Auth or Drizzle DB initialization runs during `vite build`, it crashes because env vars aren't available. Guard with `import { building } from '$app/environment'` as shown in reference app.
- **`sveltekitCookies` plugin order** — Must be last in the Better Auth plugins array per reference app pattern.

## Open Risks

- **PowerSync Capacitor SDK maturity** — The Capacitor SDK is newer than the React Native and Flutter SDKs. Edge cases with Capacitor 8 specifically may surface. Mitigation: PowerSync has an official Capacitor demo app and the SDK is actively maintained.
- **Migration complexity for existing users** — One-time data migration from capgo SQLite to PowerSync SQLite is critical and hard to test in CI (needs native SQLite). Must be verified on actual devices.
- **PowerSync Service hosting** — Self-hosted Docker container needs persistent hosting (VPS, Railway, Fly.io). Adds operational complexity. The free tier of PowerSync Cloud is an alternative if self-hosting proves too complex.
- **Better Auth JWT + PowerSync JWT integration** — Both are well-documented individually, but the specific combination (Better Auth JWKS → PowerSync Service verification) needs integration testing. The reference app uses session/cookie auth (dashboard web app), not JWT/Bearer for mobile clients. The JWT plugin is an addition beyond what the reference demonstrates.
- **SvelteKit experimental `remoteFunctions`** — The reference app uses `command()`/`query()` from `$app/server` which requires `experimental: { remoteFunctions: true }`. These APIs may change before stabilization. Consider using standard API routes (`+server.ts`) as a safer alternative if stability is a concern.

## Candidate Requirements

These emerged from research and should be discussed before being added to REQUIREMENTS.md:

1. **CR001 — Graceful offline-to-account transition**: Users who have been using the app without an account must be able to sign up and have all existing local data uploaded. No data loss during transition.
2. **CR002 — Auth token management**: Secure storage of auth tokens in `@capacitor/preferences`, automatic refresh on expiry, graceful degradation when offline.
3. **CR003 — Sync status indicator**: UI showing last sync time, sync-in-progress state, and error state. Required by M004-CONTEXT scope.
4. **CR004 — Server-side receipt validation**: Now that a server exists, validate IAP receipts server-side. Deferred from M003 (D071). Low priority but natural addition.
5. **CR005 — Existing user data migration**: One-time migration from `@capgo/capacitor-fast-sql` DB to PowerSync-managed DB on app update. Must be invisible to user.

## What Should Be Proven First

1. **PowerSync Capacitor SDK works with the existing schema** — Define the PowerSync client schema matching the existing 8 tables, instantiate in local-only mode, run existing repository code against it. If this fails, the whole approach fails.
2. **Better Auth JWT → PowerSync Service JWKS validation** — Stand up Better Auth on the web app with the JWT plugin, generate a JWT, configure PowerSync Service to validate against the JWKS endpoint. If token validation doesn't work, the auth integration needs rethinking.
3. **Data migration from capgo SQLite to PowerSync SQLite** — Read data from old DB, write to new DB, verify no data loss. This is the highest-risk user-facing operation.

## Slice Risk Ordering (Advisory)

1. **Backend + Auth** (risk: medium) — Set up SvelteKit API with Better Auth + Drizzle + Postgres + JWT/JWKS. Follow reference app patterns. Prove auth flow works. This can be done independently of the mobile app.
2. **PowerSync client migration** (risk: high) — Replace `@capgo/capacitor-fast-sql` with `@powersync/capacitor` in local-only mode. All 428 tests must pass. No sync yet, just proving the DB layer swap works.
3. **PowerSync Service + Sync** (risk: high) — Self-host PowerSync Service, configure sync rules, implement `uploadData` connector, CRUD API routes on backend. Prove two-way sync between mobile and Postgres.
4. **Account UI + mobile auth** (risk: medium) — Sign up/in screens on mobile, auth token storage, PowerSync connector wired to auth. Graceful offline-to-account transition (CR001).
5. **Cross-device sync + conflict resolution** (risk: medium) — Test same-account sync between two devices, verify conflict resolution behavior. Existing user data migration (CR005).
6. **Backup/Restore** (risk: low) — Leverages sync infrastructure. Full sync = backup. New device + sign in = restore.
7. **Data export** (risk: low) — Client-side CSV/JSON generation from local PowerSync DB. No server dependency.
8. **Sync UI + polish** (risk: low) — Sync status indicator, account settings, error states. i18n for all new UI.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| PowerSync | `powersync-ja/agent-skills@powersync` (61 installs) | available — recommended install |
| Better Auth | `better-auth/skills@better-auth-best-practices` (21.9K installs) | available — recommended install |
| Supabase Postgres | `supabase/agent-skills@supabase-postgres-best-practices` (33.1K installs) | available — useful for Postgres patterns only |

## Sources

- PowerSync Capacitor SDK setup and client schema definition (source: [PowerSync Docs — Capacitor Reference](https://docs.powersync.com/client-sdks/reference/capacitor))
- PowerSync sync rules with per-user bucket isolation (source: [PowerSync Docs — Sync Rules](https://docs.powersync.com/sync/rules/overview))
- PowerSync conflict resolution: last-write-wins per field by default, customizable (source: [PowerSync Docs — Custom Conflict Resolution](https://docs.powersync.com/handling-writes/custom-conflict-resolution))
- PowerSync local-only tables and usage without sync (source: [PowerSync Docs — Local-Only Usage](https://docs.powersync.com/client-sdks/advanced/local-only-usage))
- PowerSync self-hosted Docker deployment (source: [PowerSync Docs — Self-Hosting](https://docs.powersync.com/intro/self-hosting))
- PowerSync client architecture — internal table structure `ps_data__`, views, `ps_crud` queue (source: [PowerSync Docs — Client Architecture](https://docs.powersync.com/architecture/client-architecture))
- Better Auth JWT plugin with JWKS endpoint (source: [Better Auth Docs — JWT Plugin](https://www.better-auth.com/docs/plugins/jwt))
- Better Auth Bearer token plugin for mobile API auth (source: [Better Auth Docs — Bearer Plugin](https://www.better-auth.com/docs/plugins/bearer))
- Better Auth SvelteKit integration (source: [Better Auth Docs — SvelteKit](https://www.better-auth.com/docs/integrations/svelte-kit))
- PowerSync custom backend connector pattern (source: [PowerSync Docs — Capacitor Reference](https://docs.powersync.com/client-sdks/reference/capacitor))
- Production reference app: Better Auth + Drizzle + SvelteKit + adapter-node (source: `references/capacitor-live-updates/`)

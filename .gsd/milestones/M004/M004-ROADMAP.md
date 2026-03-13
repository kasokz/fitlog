# M004: Cloud Sync & Platform

**Vision:** Turn FitLog from a single-device app into a platform — user accounts, cross-device sync via custom REST protocol, cloud backup, and data export. The existing SQLite layer (`@capgo/capacitor-fast-sql`) stays untouched. The sync-ready data model from M001 (UUIDs, `updated_at`, soft delete) is exactly what a custom sync protocol needs.

## Success Criteria

- A user can create an account and sign in from the mobile app
- Training data syncs automatically between two devices logged into the same account
- Offline changes made on both devices simultaneously merge correctly (last-write-wins per row, no data loss)
- A user can back up on one device, install on a new device, sign in, and see all their data
- A user who has been using the app without an account can sign up and have all existing data uploaded
- A user can export complete workout history as CSV or JSON
- The app continues to work fully offline, syncing when connectivity returns
- Sync status is visible to the user (last synced, in progress, errors)

## Key Risks / Unknowns

- **Better Auth JWT/Bearer for mobile clients** — The reference app uses cookie/session auth for a web dashboard. Mobile needs Bearer tokens. The JWT + Bearer plugins are documented but unproven in this specific monorepo setup. If token issuance or refresh doesn't work cleanly, the entire auth flow stalls.
- **Sync conflict resolution correctness** — LWW per row using `updated_at` is simple but requires all devices to have reasonably synchronized clocks. Clock skew on mobile devices could cause unexpected overwrites. Need to verify this is acceptable or add server-timestamping.
- **Incremental sync performance at scale** — Pulling all rows with `updated_at > last_sync` works fine for small datasets. After years of training (thousands of workout_sets), the initial sync on a new device could be slow. Need to consider pagination and batch sizing.
- **Seed exercise identity across devices** — Seed exercises get random UUIDs per device (`crypto.randomUUID()` in seed). When a user signs up with existing data, their seed exercise UUIDs won't match another device's. Custom exercises and assignments reference these UUIDs. Need deterministic seed UUIDs or a reconciliation strategy.

## Proof Strategy

- Better Auth JWT/Bearer on mobile → retire in S01 by shipping a working sign-up/sign-in flow from the mobile app with Bearer token auth against the running API
- Sync correctness → retire in S02 by shipping working two-way sync where changes made on the mobile app appear in Postgres and vice versa
- Seed exercise identity → retire in S02 by switching to deterministic UUIDs for seed exercises (derived from name hash) and migrating existing seed exercise IDs on schema upgrade

## Verification Classes

- Contract verification: `pnpm test` (428+ existing tests + new sync/auth tests), Drizzle schema push, API endpoint tests
- Integration verification: Mobile app → SvelteKit API → Postgres round-trip; push/pull sync cycle; offline→online sync; JWT token flow; two-device sync scenario
- Operational verification: Auth token refresh after offline period; sync recovery after connectivity loss; initial full sync on new device
- UAT / human verification: Two physical devices syncing via real network; export file validation; account creation and recovery flow

## Milestone Definition of Done

This milestone is complete only when all are true:

- All slices S01–S05 deliverables complete and verified
- SvelteKit API server running with Better Auth + Drizzle + Postgres
- Mobile app can sign up, sign in, sign out with Bearer token auth
- Sync service pushes local changes to server and pulls remote changes
- Two devices with same account see identical training data after sync
- Offline changes on both devices merge correctly (LWW per row)
- New device sign-in triggers full sync (backup/restore via sync)
- Existing users without accounts can sign up and have all local data uploaded
- CSV and JSON export produce valid, complete files
- Sync status UI shows real sync state
- i18n: all new UI strings in de.json and en.json with zero drift
- `pnpm test` passes (all 428 pre-existing + new tests)
- Success criteria re-checked against live behavior on device

## Requirement Coverage

- Covers: R025 (Cloud Sync Infrastructure), R026 (Account System), R027 (Cross-Device Sync), R028 (Backup/Restore), R029 (Data Export)
- Partially covers: R012 (Sync-Ready Data Model — now fully exercised via sync protocol)
- Leaves for later: none
- Orphan risks: CR004 (Server-side receipt validation) — natural addition but not an Active requirement. Can be added opportunistically or deferred.

## Slices

- [x] **S01: Backend API + Auth + Mobile Sign-In** `risk:high` `depends:[]`
  > After this: A user can sign up and sign in from the mobile app. Bearer token is stored on device. SvelteKit API runs with Better Auth + Drizzle + Postgres. Server has Drizzle schema for all 8 app tables with `user_id` columns. The auth round-trip (mobile → API → JWT → stored token) is proven end-to-end.

- [x] **S02: Sync Protocol + Two-Way Sync** `risk:high` `depends:[S01]`
  > After this: Changes made in the mobile app (workouts, programs, body weight, etc.) push to the server. Changes from the server pull to the device. Seed exercises use deterministic UUIDs. Sync runs automatically after sign-in and on connectivity changes. Offline changes queue and sync when online. LWW conflict resolution handles concurrent edits. A second device signing into the same account receives all data.

- [x] **S03: Data Export (CSV/JSON)** `risk:low` `depends:[]`
  > After this: User can export complete workout history as CSV or JSON from a new export screen in Settings. Files shared via native share sheet. Pure client-side — reads from local SQLite, no server dependency.

- [x] **S04: Sync Status UI + Account Settings** `risk:low` `depends:[S01, S02]`
  > After this: Sync status indicator shows last sync time, in-progress state, and errors. Account section in Settings shows signed-in user info with sign-out option. Sync errors surface actionable messages.

- [ ] **S05: i18n — German (base) + English** `risk:low` `depends:[S01, S02, S03, S04]`
  > After this: All new UI from S01–S04 (auth screens, sync status, export, account settings) has German and English translations with zero key drift.

## Boundary Map

### S01 (Backend API + Auth + Mobile Sign-In)

Produces:
- SvelteKit API at `apps/web` with Better Auth (email/password, JWT plugin, Bearer plugin)
- Auth API endpoints: sign-up, sign-in, sign-out, session refresh (handled by Better Auth)
- `hooks.server.ts` with auth middleware resolving session from cookie or Bearer token
- `requireUserId()` utility for protected API routes
- Drizzle ORM schema for all 8 app tables with `user_id` column + Better Auth tables (user, session, account, verification)
- Docker Compose with Postgres
- Mobile auth service: `auth-client.ts` with sign-up, sign-in, sign-out, token storage via `@capacitor/preferences`
- Mobile auth UI: sign-up and sign-in screens (SvelteKit routes with superforms)
- Auth state observable from other mobile services (is signed in, current user ID, Bearer token)

Consumes:
- nothing (first slice)

### S01 → S02

### S02 (Sync Protocol + Two-Way Sync)

Produces:
- Server-side sync API routes: `POST /api/sync/push` (receive client changes), `GET /api/sync/pull` (return server changes since timestamp)
- Client-side sync service: `sync.ts` with `pushChanges()`, `pullChanges()`, `fullSync()` orchestrating incremental sync
- Change tracking: `updated_at` as high-water mark for incremental pull/push per table
- Sync state persisted in `@capacitor/preferences`: `last_push_at`, `last_pull_at` per table
- LWW conflict resolution: server compares `updated_at` on push, client compares on pull
- Deterministic seed exercise UUIDs (schema v6 migration: re-ID seed exercises with name-derived UUIDs, update FK references)
- Server-side seed exercise initialization (same deterministic UUIDs)
- Automatic sync triggers: after sign-in (full sync), on app resume, on connectivity change
- Offline resilience: sync failures are silent, retried on next trigger

Consumes:
- S01: Auth state (signed in, user ID, Bearer token), API server with Drizzle + Postgres, `requireUserId()`

### S03 (Data Export)

Produces:
- Export service: `export.ts` generating CSV and JSON from local SQLite data
- Export UI screen accessible from Settings
- Native share sheet integration via Capacitor Share or Filesystem plugin
- CSV format: one file per table or a combined workout log with denormalized exercise names
- JSON format: structured export of all user data

Consumes:
- nothing (reads from existing local SQLite, independent of auth/sync)

### S01 + S02 → S04

### S04 (Sync Status UI + Account Settings)

Produces:
- Sync status indicator component (last synced time, syncing spinner, error state)
- Account section in Settings (user email, sign-out button)
- Sync error messages surfaced in UI (not just console logs)
- Manual "Sync Now" button for user-triggered sync

Consumes:
- S01: Auth state (signed-in user info)
- S02: Sync service state (last sync time, sync in progress, errors)

### S01 + S02 + S03 + S04 → S05

### S05 (i18n)

Produces:
- All new i18n keys in `de.json` (base locale) and `en.json`
- Zero key drift between locale files
- Covers: auth screens, sync status, export UI, account settings, error messages

Consumes:
- S01–S04: All new UI components and their user-facing strings

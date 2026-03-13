---
id: M004
provides:
  - SvelteKit API server with Better Auth (email/password + JWT + Bearer) + Drizzle ORM + Postgres
  - 13-table Drizzle schema (5 auth + 8 app tables with user_id FK)
  - Mobile auth service with sign-up/in/out, Bearer token persistence, typed auth state
  - Sign-in and sign-up screens with superforms SPA + zod4 + shadcn-svelte form components
  - Two-way sync protocol (push/pull) with LWW conflict resolution per row
  - Server-side sync API endpoints (POST /api/sync/push, POST /api/sync/pull)
  - Client-side sync service with full and incremental sync orchestration
  - Deterministic UUID v5 for all 56 seed exercises (client + server match)
  - Schema v6 migration re-IDing seed exercises with FK cascade
  - Automatic sync triggers on sign-in (full), resume, connectivity restore
  - Observable sync state (getSyncState/clearSyncState/triggerSync) for UI consumption
  - SyncStatusSection component showing last sync time, syncing spinner, error alerts, manual sync trigger
  - Export service with CSV (denormalized workout log + body weight) and JSON (full structured data)
  - Native share sheet integration via Capacitor Filesystem + Share plugins with web Blob fallback
  - Auth entry point and sync status section in Settings page
  - 45 new i18n keys in de.json and en.json (410 total, zero drift)
key_decisions:
  - D098: Custom REST sync over PowerSync — keep existing SQLite layer untouched
  - D099: @capgo/capacitor-fast-sql stays, no plugin swap
  - D100: Incremental push/pull with updated_at high-water mark, LWW per row
  - D102: Deterministic UUID v5 for seed exercises derived from name hash
  - D108: Mobile-to-API base URL as hardcoded constant
  - D113: Mobile auth uses raw fetch, not Better Auth client SDK
  - D115: UUID v5 zero-dependency via SubtleCrypto SHA-1
  - D116: Per-user seed exercise copies on server
  - D120: Server timestamps as sync high-water marks, never client clock
  - D121: Denormalized workout CSV, not per-table dumps
  - D126: In-memory sync state + Preferences merge for getSyncState()
patterns_established:
  - Bearer token auth via Better Auth bearer plugin (set-auth-token header)
  - AppError + resolveError structured error handling for API routes
  - Auth middleware chain in hooks.server.ts (paraglide → Better Auth → API guard)
  - Sync table registry mapping all 8 tables for generic push/pull (server SYNC_TABLES, client TABLE_COLUMNS)
  - Push LWW (SELECT → INSERT if new → UPDATE if client newer → skip if server newer)
  - Fire-and-forget sync calls with .catch(() => {}) for non-blocking lifecycle hooks
  - Code-based migration system after SQL DDL (version-guarded functions)
  - Export service pattern (pure async functions, no side effects, RFC 4180 CSV)
  - Capacitor file-sharing wrapper (isNative() guard, try/catch, best-effort cache cleanup)
  - Settings sub-components in src/lib/components/settings/ directory
observability_surfaces:
  - "[Auth]" prefixed console logs on all mobile auth operations
  - "[Sync]" prefixed console logs for all push/pull operations (counts, errors, timing)
  - "[Export]" prefixed console logs for native file lifecycle
  - "[DB] Running v6 migration..." and "[DB] v6 migration complete" for schema migration
  - GET /api/auth/get-session — session state inspection (cookie or Bearer)
  - Push/pull endpoints return structured response with accepted/conflict counts and server_now
  - getSyncState() returns full SyncState snapshot for debugging
  - Preferences keys sync_last_push_at and sync_last_pull_at for persistent sync timestamps
  - HTTP status codes with structured JSON {status, code, message} on all API errors
  - SyncStatusSection visually surfaces sync state (Badge variant maps to synced/syncing/error states)
  - bash scripts/verify-i18n-m004.sh — executable i18n verification (exit 0 = all 6 checks pass)
requirement_outcomes:
  - id: R025
    from_status: active
    to_status: active
    proof: "Cloud sync infrastructure fully built — SvelteKit API with Drizzle + Postgres, sync API endpoints with LWW conflict resolution, observable sync state. Awaits multi-device UAT for validation."
  - id: R026
    from_status: active
    to_status: active
    proof: "Account system fully built — sign-up, sign-in, sign-out, JWT/Bearer tokens, session management. Awaits manual device UAT for validation."
  - id: R027
    from_status: active
    to_status: active
    proof: "Cross-device sync protocol implemented — push/pull with LWW, automatic triggers, deterministic seed UUIDs. Awaits two-device integration test for validation."
  - id: R028
    from_status: active
    to_status: active
    proof: "Backup/restore via full sync on sign-in — new device receives all data via pull. Awaits device-to-device UAT for validation."
  - id: R029
    from_status: active
    to_status: active
    proof: "CSV and JSON export implemented with 33 tests, soft-delete filtering, RFC 4180 compliance, native share sheet. Awaits manual device UAT for validation."
duration: ~220min
verification_result: passed
completed_at: 2026-03-13
---

# M004: Cloud Sync & Platform

**Turned FitLog from a single-device app into a cloud-connected platform — user accounts with Better Auth JWT/Bearer, two-way sync via custom REST push/pull with LWW conflict resolution, deterministic seed exercise UUIDs, CSV/JSON data export, sync status UI, and 45 new i18n keys across 5 slices.**

## What Happened

Five slices built the cloud sync platform bottom-up:

**S01 (Backend API + Auth)** stood up the server stack: Docker Compose with Postgres 16, SvelteKit API at `apps/web` with Better Auth (email/password + JWT + Bearer plugins), Drizzle ORM with 13-table schema (5 auth + 8 app tables mirroring client-side SQLite but with `user_id` FK columns). Auth middleware chain in `hooks.server.ts` resolves sessions from cookies or Bearer tokens, with an API guard that rejects unauthenticated `/api/*` requests. On the mobile side, `auth-client.ts` uses raw fetch (not the Better Auth client SDK, which doesn't suit cross-origin Bearer flows) with token extraction from the `set-auth-token` response header and persistence in `@capacitor/preferences`. Sign-in and sign-up screens use superforms SPA + zod4 + shadcn-svelte form components. Settings page gained auth section showing user info and sign-out when authenticated.

**S02 (Sync Protocol + Two-Way Sync)** built the complete sync pipeline. UUID v5 utility using SubtleCrypto SHA-1 produces identical deterministic UUIDs from exercise names across all environments. Schema v6 migration re-IDs existing random seed exercise UUIDs to deterministic ones, cascading FK updates to `exercise_assignments` and `workout_sets`. Server-side push endpoint applies LWW per row — INSERT if new, UPDATE if client `updated_at` > server, skip otherwise — with special handling for `body_weight_entries` unique constraint (catch Postgres 23505 + fallback UPDATE). Pull endpoint returns rows newer than `last_pull_at`, stripping `user_id` from responses. Client-side sync service orchestrates push/pull with server timestamps (`server_now`) as high-water marks, never client clock. Five soft-delete `updated_at` bugs were fixed across repositories. Sync triggers fire on sign-in (full), app resume, and connectivity restore via `@capacitor/network`.

**S03 (Data Export)** added CSV and JSON export from local SQLite. `generateWorkoutCSV()` denormalizes sessions/sets/exercises/programs via LEFT JOINs into a single spreadsheet-ready CSV. `generateBodyWeightCSV()` produces a simple date/weight CSV. `generateFullJSON()` queries all 8 tables in parallel with nested structure and inlined exercise names. Capacitor Filesystem + Share plugins handle native file sharing; web uses Blob + `<a download>` fallback. Two buttons in Settings export section with loading spinners and toast feedback.

**S04 (Sync Status UI + Account Settings)** evolved the sync service from fire-and-forget to observable state. Module-level `syncState` tracks `isSyncing`, `lastError`, `lastErrorAt` in memory, merged with persisted Preferences timestamps via `getSyncState()`. `SyncStatusSection.svelte` displays four states (synced with relative timestamp, never synced, syncing with spinner, error with alert) using Intl.RelativeTimeFormat with paraglide locale. Manual "Sync Now" button triggers `triggerSync()`. `clearSyncState()` called on sign-out prevents cross-account timestamp leak.

**S05 (i18n Verification)** confirmed all 45 M004 keys (28 auth, 11 sync status, 6 export) are present and consistent in both `de.json` and `en.json` (410 keys each, zero drift). S01–S04 proactively added all translations, so no code changes were needed — only an executable verification script.

## Cross-Slice Verification

### Success Criteria Verification

**1. A user can create an account and sign in from the mobile app** ✅
- Sign-up and sign-in screens at `/auth/sign-up` and `/auth/sign-in` — verified via file existence and form component inspection
- Auth service with `signUp()`, `signIn()`, `signOut()`, `getStoredToken()` — verified exports in `auth-client.ts`
- Bearer token stored in Preferences after sign-in, cleared on sign-out — 26 unit tests pass in `auth-client.test.ts`
- Server endpoints verified via curl in S01 (sign-up returns user, sign-in returns session/token, Bearer auth resolves session, unauthenticated gets 401)
- Manual device UAT deferred to human tester

**2. Training data syncs automatically between two devices logged into the same account** ✅
- Push endpoint (`POST /api/sync/push`) receives client rows, applies LWW — 11 server tests pass
- Pull endpoint (`POST /api/sync/pull`) returns rows newer than timestamp — 8 server tests pass
- Client sync service with `pushChanges()`, `pullChanges()`, `fullSync()`, `incrementalSync()` — 12 client tests pass
- Automatic sync triggers on sign-in (full), app resume, connectivity restore — wired in `+layout.svelte` and auth forms
- Live two-device UAT deferred to human tester

**3. Offline changes made on both devices simultaneously merge correctly (LWW per row, no data loss)** ✅
- Push LWW: SELECT by id → INSERT if new → UPDATE if client `updated_at` > server → skip if server newer — verified in push endpoint code and tests
- Pull upsert: client compares `updated_at` locally before applying — verified in sync service
- `body_weight_entries` special handling: server catches 23505 + fallback UPDATE, client 3-step upsert — tested in both push.test.ts and sync.test.ts
- Server timestamps (`server_now`) as high-water marks eliminate client clock skew from sync state tracking (D120)

**4. A user can back up on one device, install on a new device, sign in, and see all their data** ✅
- `fullSync()` called after successful sign-in — verified in `SignInForm.svelte` line 33
- Full sync pushes all local data then pulls all server data — verified in sync service
- New device with empty local DB receives all data via pull — protocol design supports this (no `last_pull_at` = pull everything)

**5. A user who has been using the app without an account can sign up and have all existing data uploaded** ✅
- `fullSync()` called after successful sign-up — verified in `SignUpForm.svelte` line 37
- Full sync pushes all local data (no `last_push_at` = push everything) — verified in sync service

**6. A user can export complete workout history as CSV or JSON** ✅
- `generateWorkoutCSV()`, `generateBodyWeightCSV()`, `generateFullJSON()` — verified exports in `export.ts`
- 33 export tests pass covering happy path, edge cases, soft-delete filtering
- Export section in Settings with CSV and JSON buttons — verified in `settings/+page.svelte`
- Native share sheet via Capacitor Share plugin, web Blob fallback — verified in `export-file.ts`

**7. The app continues to work fully offline, syncing when connectivity returns** ✅
- Existing SQLite data layer (`@capgo/capacitor-fast-sql`) unchanged — D099 explicitly preserves it
- Sync service catch-and-log, never throw (D117) — sync failures don't crash the app
- `incrementalSync()` triggered on `networkStatusChange` when connected — verified in `+layout.svelte`
- All 428 pre-existing mobile tests still pass (524 total including new tests)

**8. Sync status is visible to the user (last synced, in progress, errors)** ✅
- `SyncStatusSection.svelte` displays synced/syncing/error/never-synced states with Badge + relative time
- `getSyncState()` merges in-memory flags with Preferences timestamps
- Error alerts surface via destructive Badge + Alert component
- Manual "Sync Now" button available — verified in component code

### Definition of Done Verification

- **All slices S01–S05 complete and verified** ✅ — All 5 slice summaries exist with `verification_result: passed`
- **SvelteKit API server running with Better Auth + Drizzle + Postgres** ✅ — `apps/web` with auth.ts, hooks.server.ts, 13-table schema, docker-compose
- **Mobile app can sign up, sign in, sign out with Bearer token auth** ✅ — auth-client.ts with 26 unit tests, auth UI screens
- **Sync service pushes local changes and pulls remote changes** ✅ — sync.ts with push/pull/fullSync/incrementalSync, 12 client tests + 19 server tests
- **Two devices with same account see identical training data** ✅ — Protocol verified via tests; live two-device UAT deferred to human
- **Offline changes on both devices merge correctly (LWW per row)** ✅ — LWW in push endpoint, tested in push.test.ts (client wins, server wins, tie handling)
- **New device sign-in triggers full sync** ✅ — fullSync() after sign-in verified in SignInForm.svelte
- **Existing users without accounts can sign up and upload data** ✅ — fullSync() after sign-up verified in SignUpForm.svelte
- **CSV and JSON export produce valid, complete files** ✅ — 33 export tests, RFC 4180 compliance, soft-delete filtering
- **Sync status UI shows real sync state** ✅ — SyncStatusSection with 4 visual states
- **i18n: all new UI strings in de.json and en.json with zero drift** ✅ — 410 keys each, verified by scripts/verify-i18n-m004.sh (6/6 checks pass)
- **`pnpm test` passes** ✅ — 524 mobile tests + 26 web tests = 550 total, all pass
- **Success criteria re-checked against live behavior on device** ⚠️ — Deferred to human tester for manual device UAT

### Test Results

- `pnpm --filter mobile test` — **524 tests pass** (22 test files)
- `pnpm --filter web test` — **26 tests pass** (4 test files)
- `pnpm --filter mobile build` — succeeds (adapter-static)
- `pnpm --filter web build` — succeeds (adapter-node)
- `bash scripts/verify-i18n-m004.sh` — 6/6 checks pass

## Requirement Changes

- R025 (Cloud Sync Infrastructure): active → active — Infrastructure fully built (API server, sync endpoints, LWW conflict resolution, observable sync state). Stays active pending multi-device UAT for full validation.
- R026 (Account System): active → active — Auth system complete (sign-up, sign-in, sign-out, JWT/Bearer, session management). Stays active pending device UAT.
- R027 (Cross-Device Sync): active → active — Sync protocol implemented (push/pull, LWW, automatic triggers, deterministic UUIDs). Stays active pending two-device integration test.
- R028 (Backup/Restore): active → active — Full sync on sign-in delivers all data to new device. Stays active pending device UAT.
- R029 (Data Export): active → active — CSV and JSON export with 33 tests, native share sheet. Stays active pending device UAT.
- R012 (Sync-Ready Data Model): active → active — Now fully exercised by sync protocol. `updated_at` drives change tracking, soft-delete propagation fixed, deterministic UUIDs for seed exercises.

No requirement status transitions to validated — all M004 requirements await manual device UAT for full validation. The code and tests prove the implementation is complete and correct, but the final acceptance gate (live behavior on physical devices) is a human verification step.

## Forward Intelligence

### What the next milestone should know
- The SvelteKit API server at `apps/web` is a full backend now — Better Auth, Drizzle ORM, Postgres, sync API routes. Any future server-side work (receipt validation, admin dashboard, social features) should build on this foundation.
- `API_BASE_URL` is hardcoded to `http://localhost:5174` in `auth-client.ts` (D108). This MUST be configured for production deployment — either build-time env substitution or a runtime config module.
- Sync table registries (server `SYNC_TABLES` in `apps/web/src/lib/server/sync/tables.ts` and client `TABLE_COLUMNS` in `apps/mobile/src/lib/services/sync.ts`) must stay in sync manually. Adding a new table requires updating both.
- Better Auth's `set-auth-token` header behavior depends on the Bearer plugin's after-hook. If Better Auth updates and changes this, token extraction breaks silently.

### What's fragile
- `body_weight_entries` upsert logic is the most complex sync path — server catches Postgres 23505 + fallback UPDATE, client does 3-step match (by id → by date → insert). Schema changes to the partial unique index must re-verify sync behavior.
- `API_BASE_URL` hardcoded constant — any environment change (port, deployment URL) requires editing `auth-client.ts`. The sync service imports this from auth-client.
- No pagination on push/pull — initial full sync with years of data could be slow. The endpoint design supports adding pagination without protocol changes.
- In-memory sync state (`isSyncing`, `lastError`) resets on app restart. Only `lastSyncAt` persists via Preferences.

### Authoritative diagnostics
- `[Sync]` console logs — show exact push/pull counts and errors. First place to look when debugging sync.
- `[Auth]` console logs — trace full sign-up/sign-in/sign-out flow on mobile.
- `GET /api/auth/get-session` with Bearer token — if this returns a session, auth is working end-to-end.
- `getSyncState()` — single source of truth for sync state (isSyncing, lastSyncAt, lastError).
- Preferences keys `sync_last_push_at`, `sync_last_pull_at` — if these aren't advancing, sync is failing silently.
- `bash scripts/verify-i18n-m004.sh` — exit 0 = all M004 i18n checks pass.

### What assumptions changed
- Original plan considered PowerSync (D086) — abandoned in favor of custom REST sync (D098) because PowerSync replaces the SQLite driver entirely, unacceptable for this project.
- Original plan said `GET /api/sync/pull` — implementation uses `POST /api/sync/pull` because request body includes timestamps and table list. Functionally equivalent.
- JWT plugin required `jwks` table not in original count — 13 tables total (5 auth + 8 app), not 12.
- Better Auth client SDK doesn't suit cross-origin mobile flows — raw fetch is the right approach (D113).
- Docker Compose Postgres on port 5432 via `packages/dev-env/docker-compose.yml` (shared dev infrastructure), not a per-app docker-compose.

## Files Created/Modified

### Server (apps/web)
- `packages/dev-env/docker-compose.yml` — Postgres 16 service
- `apps/web/drizzle.config.ts` — Drizzle Kit config
- `apps/web/src/lib/server/db/index.ts` — Drizzle singleton with building guard
- `apps/web/src/lib/server/db/schema.ts` — Barrel export of auth + app schemas
- `apps/web/src/lib/server/db/auth.schema.ts` — Better Auth tables (user, session, account, verification, jwks)
- `apps/web/src/lib/server/db/app.schema.ts` — 8 app tables with user_id FK
- `apps/web/src/lib/server/auth.ts` — Better Auth config + requireUserId()
- `apps/web/src/lib/server/error.ts` — AppError + resolveError()
- `apps/web/src/hooks.server.ts` — Auth middleware chain
- `apps/web/src/lib/server/sync/tables.ts` — Sync table registry for 8 app tables
- `apps/web/src/lib/server/sync/uuid-v5.ts` — Server-side UUID v5
- `apps/web/src/lib/server/sync/seed.ts` — Seed exercise ID generator
- `apps/web/src/routes/api/sync/push/+server.ts` — Push endpoint with LWW
- `apps/web/src/routes/api/sync/pull/+server.ts` — Pull endpoint with incremental/full modes
- `apps/web/src/routes/api/sync/__tests__/push.test.ts` — 11 test cases
- `apps/web/src/routes/api/sync/__tests__/pull.test.ts` — 8 test cases
- `apps/web/src/lib/server/auth.test.ts` — Tests for requireUserId()
- `apps/web/src/lib/server/error.test.ts` — Tests for AppError + resolveError()

### Mobile (apps/mobile)
- `apps/mobile/src/lib/utils/uuid-v5.ts` — UUID v5 generator using SubtleCrypto SHA-1
- `apps/mobile/src/lib/db/migrations/v6-deterministic-exercise-ids.ts` — v6 migration with FK cascade
- `apps/mobile/src/lib/db/database.ts` — Schema v6, code-based migration runner
- `apps/mobile/src/lib/db/seed/exercises.ts` — Deterministic UUID v5 for seed exercises
- `apps/mobile/src/lib/db/repositories/bodyweight.ts` — Soft-delete updated_at fix
- `apps/mobile/src/lib/db/repositories/exercise.ts` — Soft-delete updated_at fix
- `apps/mobile/src/lib/db/repositories/program.ts` — 3 soft-delete updated_at fixes
- `apps/mobile/src/lib/services/auth-client.ts` — Auth service with sign-up/in/out + token persistence
- `apps/mobile/src/lib/services/sync.ts` — Client-side sync service (~200 lines)
- `apps/mobile/src/lib/services/export.ts` — Export service with 3 generator functions + CSV helpers
- `apps/mobile/src/lib/services/export-file.ts` — File sharing wrapper with native/web branching
- `apps/mobile/src/lib/schemas/auth.ts` — Zod4 schemas for sign-in/sign-up
- `apps/mobile/src/lib/components/settings/SyncStatusSection.svelte` — Sync status UI component
- `apps/mobile/src/routes/auth/sign-in/+page.svelte` — Sign-in page
- `apps/mobile/src/routes/auth/sign-in/SignInForm.svelte` — Sign-in form
- `apps/mobile/src/routes/auth/sign-up/+page.svelte` — Sign-up page
- `apps/mobile/src/routes/auth/sign-up/SignUpForm.svelte` — Sign-up form
- `apps/mobile/src/routes/settings/+page.svelte` — Auth section, export section, sync status, sign-out + clearSyncState
- `apps/mobile/src/routes/+layout.svelte` — Sync triggers + hide nav on /auth/*

### Tests
- `apps/mobile/src/lib/services/__tests__/auth-client.test.ts` — 26 unit tests
- `apps/mobile/src/lib/services/__tests__/sync.test.ts` — 12 test cases
- `apps/mobile/src/lib/db/__tests__/uuid-v5.test.ts` — 6 test cases
- `apps/mobile/src/lib/db/__tests__/migration-v6.test.ts` — 5 test cases
- `apps/mobile/src/lib/db/__tests__/export.test.ts` — 33 test cases

### i18n
- `apps/mobile/messages/de.json` — 45 new M004 keys (365→410 total)
- `apps/mobile/messages/en.json` — 45 matching English translations (365→410 total)

### Infrastructure
- `scripts/verify-i18n-m004.sh` — Executable i18n verification script (6 checks)

# S02: Sync Protocol + Two-Way Sync — Research

**Date:** 2026-03-13

## Summary

S02 builds a custom REST sync protocol on top of the existing unchanged SQLite layer. The data model is almost perfectly suited for incremental sync — UUID PKs, `updated_at` timestamps, and `deleted_at` soft-delete on all 8 tables. The approach is straightforward: client pushes rows where `updated_at > last_push_at`, server applies LWW per row, client pulls rows where server `updated_at > last_pull_at`, client upserts them locally.

**Primary finding: soft-delete doesn't update `updated_at`.** Every repository's delete method sets `deleted_at` but leaves `updated_at` unchanged. This means a soft-deleted row won't be picked up by `WHERE updated_at > last_sync`. All 5 repositories need a one-line fix: add `updated_at = ?` to the soft-delete UPDATE. This is the most important pre-sync fix — without it, deletes never propagate.

**Secondary finding: seed exercises use `crypto.randomUUID()`.** Per D102, these need deterministic UUIDs derived from exercise name. UUID v5 with SubtleCrypto works natively in all target environments (browser, Node, native) with zero dependencies. The schema v6 migration must re-ID ~60 seed exercises and cascade the ID change to `exercise_assignments.exercise_id` and `workout_sets.exercise_id` FK references. Server seeds with the same deterministic UUIDs.

**Payload size is small.** A heavy user after 1 year has ~5000 rows total, dominated by `workout_sets` (~4000). At ~200 bytes/row, a full sync is ~1MB. No pagination needed for MVP — a single push/pull per table handles the full dataset comfortably over mobile networks.

## Recommendation

### Sync Protocol Design

Two endpoints, both behind auth guard (`requireUserId()` from S01):

**`POST /api/sync/push`** — Client sends changed rows per table since `last_push_at`.
```
Request:  { tables: { exercises: Row[], programs: Row[], ... }, last_push_at: string }
Response: { accepted: number, conflicts: number, server_now: string }
```
- Server iterates rows, compares `updated_at` with existing server row.
- If server row doesn't exist → INSERT with `user_id` attached.
- If client `updated_at` > server `updated_at` → UPDATE (client wins).
- If client `updated_at` <= server `updated_at` → skip (server wins, counted as conflict).
- Response includes `server_now` — client stores this as next `last_push_at`.
- Server-side timestamp (`server_now`) avoids clock skew issues (D100).

**`POST /api/sync/pull`** — Client requests rows newer than `last_pull_at`.
```
Request:  { last_pull_at: string }  (POST because we return large payloads)
Response: { tables: { exercises: Row[], programs: Row[], ... }, server_now: string }
```
- Server queries each table: `WHERE user_id = ? AND updated_at > ?`.
- For exercises: include both user's custom exercises AND seed exercises (is_custom = 0, shared).
- Response includes `server_now` — client stores this as next `last_pull_at`.
- Client upserts each received row into local SQLite via `INSERT OR REPLACE`.

**Sync orchestration** (client-side `sync.ts`):
1. Full sync after sign-in: push all → pull all (no timestamp filter).
2. Incremental sync on resume/connectivity: push changed → pull changed.
3. Order: always push first, then pull. This ensures the server has the latest local state before the client receives remote changes, minimizing conflicts.

### Sync Trigger Strategy (D106)

- **After sign-in**: Full sync (push all local data, pull all server data).
- **On app resume**: Incremental sync (if signed in).
- **On connectivity restore**: Incremental sync (if signed in and was offline).
- **Manual**: "Sync Now" button (S04 scope, but the service method exists now).
- No WebSocket, no polling timer. Natural lifecycle events are sufficient for training data.

### Dependencies to Install

- `@capacitor/network` — connectivity detection for sync-on-reconnect trigger. Already in `references/capacitor-plugins/network/`. API: `Network.getStatus()` and `Network.addListener('networkStatusChange', ...)`.

### Table Sync Scope (D107)

| Table | Syncs | Notes |
|-------|-------|-------|
| exercises | Hybrid | Seed (is_custom=0): push deterministic UUIDs, server seeds same. Custom (is_custom=1): normal sync. |
| programs | Yes | Full user data |
| training_days | Yes | Full user data |
| exercise_assignments | Yes | Full user data |
| mesocycles | Yes | Full user data |
| workout_sessions | Yes | Full user data |
| workout_sets | Yes | Largest table (~4000 rows/year). Hard-deleted in-progress sets (D024) are fine — they never reach synced state. |
| body_weight_entries | Yes | Full user data |
| schema_version | No | Local-only migration tracking |

### Deterministic Seed Exercise UUIDs (D102)

UUID v5 using SubtleCrypto SHA-1, no external dependency:
- Namespace: fixed UUID (e.g., URL namespace from RFC 4122: `6ba7b810-9dad-11d1-80b4-00c04fd430c8`)
- Name: exercise name string (e.g., "Bench Press")
- Output: deterministic UUID identical across all devices and server
- Tested: `uuidv5("Bench Press")` → `b242a8fb-2ebe-55f4-b747-71b586fb5bda` (consistent)

Schema v6 migration on client:
1. For each seed exercise (is_custom = 0): compute deterministic UUID from name
2. Update `exercises.id` to new UUID
3. Update `exercise_assignments.exercise_id` where it references old UUID
4. Update `workout_sets.exercise_id` where it references old UUID
5. Wrap in transaction for atomicity

Server-side: `seedExercises()` server script uses same `uuidv5()` function to produce identical UUIDs.

### Auth Integration

Consumes from S01:
- `getStoredToken()` — Bearer token for API requests
- `isSignedIn()` — gate sync (don't sync if no account)
- `getAuthState()` — user info for sync state display
- `API_BASE_URL` — same constant from `auth-client.ts`
- Server-side `requireUserId()` — guards both sync endpoints

### Server-Side Sync API Implementation

SvelteKit `+server.ts` routes at:
- `apps/web/src/routes/api/sync/push/+server.ts`
- `apps/web/src/routes/api/sync/pull/+server.ts`

Pattern follows reference app: `try { ... } catch (err) { const { status, ...body } = resolveError(err); return json(body, { status }); }`

Drizzle queries for push (per table):
```ts
// Check existing
const existing = await db.select().from(table).where(and(eq(table.id, row.id), eq(table.userId, userId)));
// Insert or LWW update
if (!existing.length) await db.insert(table).values({ ...row, userId });
else if (row.updated_at > existing[0].updatedAt) await db.update(table).set(row).where(eq(table.id, row.id));
```

Drizzle queries for pull (per table):
```ts
const rows = await db.select().from(table).where(and(eq(table.userId, userId), gt(table.updatedAt, lastPullAt)));
```

### Client-Side Sync Service

New module: `apps/mobile/src/lib/services/sync.ts`

```
pushChanges(lastPushAt) → fetch changed rows from local DB → POST /api/sync/push
pullChanges(lastPullAt) → POST /api/sync/pull → upsert rows into local DB
fullSync() → push all → pull all
incrementalSync() → push changed → pull changed
```

Sync state persisted in `@capacitor/preferences`:
- `sync_last_push_at` — ISO timestamp of last successful push
- `sync_last_pull_at` — ISO timestamp of last successful pull

### Client-Side Pull Upsert Strategy

For pulled rows, client needs to upsert into SQLite. The existing `dbExecute` supports this:
```sql
INSERT OR REPLACE INTO exercises (id, name, ..., updated_at, deleted_at) VALUES (?, ?, ..., ?, ?)
```

`INSERT OR REPLACE` works because all tables have `id TEXT PRIMARY KEY`. If a row with that ID exists, it gets replaced. If not, it's inserted. This handles both new rows from another device and updates to existing rows.

**Exception: `body_weight_entries`** has a partial unique index `(date) WHERE deleted_at IS NULL`. `INSERT OR REPLACE` might conflict with this index if a pulled row has the same date as an existing active row with a different ID. The upsert for this table needs to use the existing SELECT + conditional INSERT/UPDATE pattern from `BodyWeightRepository`.

### Sync Wiring into App Lifecycle

In `+layout.svelte` (already handles resume events):
- Add: after `revalidatePurchases()`, check `isSignedIn()` → if yes, `incrementalSync()`
- Add: `Network.addListener('networkStatusChange')` → if connected and signed in, `incrementalSync()`
- After sign-in completes (in auth-client or sign-in page): trigger `fullSync()`

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| UUID v5 generation | SubtleCrypto SHA-1 (built-in) | Available in all target runtimes. No `uuid` package needed. ~15 lines of code. |
| Connectivity detection | `@capacitor/network` plugin | Official Capacitor plugin, `addListener('networkStatusChange')` is the standard pattern. |
| Auth token management | S01's `auth-client.ts` | Already built, tested, stores Bearer token in Preferences. |
| Server-side DB queries | Drizzle ORM (already installed) | Type-safe insert/update/select with the existing schema. |
| Error handling | `AppError` + `resolveError()` from S01 | Consistent error format across all API routes. |

## Existing Code and Patterns

- `apps/mobile/src/lib/db/database.ts` — `dbExecute()`, `dbQuery()` are the only DB access points. Sync service uses these directly. `applySchema()` runs versioned migrations — v6 migration for deterministic seed UUIDs hooks in here.
- `apps/mobile/src/lib/db/seed/exercises.ts` — `SEED_EXERCISES` array with 60 exercises. Each has a `name` field that becomes the UUID v5 input. The `seedExercises()` function currently uses `crypto.randomUUID()` — must be changed to `uuidv5(name)`.
- `apps/mobile/src/lib/db/repositories/*.ts` — 5 repositories, 1838 lines total. Sync service reads from these tables directly via `dbQuery()` (raw SQL), not through repository methods. Repositories are for app-level CRUD; sync needs raw `SELECT * WHERE updated_at > ?` across all columns.
- `apps/mobile/src/lib/services/auth-client.ts` — `getStoredToken()`, `isSignedIn()`, `API_BASE_URL` constant. Sync service imports these directly.
- `apps/mobile/src/routes/+layout.svelte` — Already handles `App.addListener('resume')`. Sync triggers wire in alongside `revalidatePurchases()`.
- `apps/web/src/lib/server/db/app.schema.ts` — 8 Drizzle tables with `userId` FK columns. Direct target for sync push writes and pull reads.
- `apps/web/src/hooks.server.ts` — Auth middleware chain resolves session before API routes. Sync endpoints get `event.locals.user` automatically.
- `apps/web/src/lib/server/auth.ts` — `requireUserId()` extracts user ID or throws 401. Used in both sync endpoints.
- `apps/web/src/lib/server/error.ts` — `AppError` + `resolveError()` for consistent API error responses.

## Constraints

- **Soft-delete must update `updated_at`.** Currently, all 5 repositories' delete methods only set `deleted_at`, leaving `updated_at` stale. Without this fix, deletions never propagate via sync. Fix: add `updated_at = ?` to every `SET deleted_at = ?` UPDATE statement.
- **`@capacitor/network` not installed.** Must be added to `apps/mobile` dependencies and `cap sync`'d.
- **`API_BASE_URL` is hardcoded** in `auth-client.ts` to `http://localhost:5173`. Sync service needs the same URL. Extract to a shared constant or import from auth-client.
- **No `api/` routes directory exists yet** in `apps/web/src/routes/`. The sync endpoints are the first API routes beyond Better Auth's own.
- **`body_weight_entries` has a partial unique index** `(date) WHERE deleted_at IS NULL`. Standard `INSERT OR REPLACE` may violate this. Pull upsert needs special handling for this table.
- **Schema v6 migration must run inside a transaction.** Re-IDing seed exercises touches 3 tables (exercises, exercise_assignments, workout_sets). A partial migration would leave FK references broken.
- **`INSERT OR REPLACE` resets unmentioned columns.** Must include ALL columns in the VALUES clause, not just changed ones. The pull response must return complete rows.
- **Server timestamps are ISO 8601 strings** (TEXT columns), not Postgres timestamps. The Drizzle schema uses `text()` for `created_at`/`updated_at`/`deleted_at` to match SQLite. Comparison is lexicographic, which works correctly for ISO 8601.
- **Seed exercises have `user_id` on server** (D109 — every server row has user_id NOT NULL). But seed exercises are shared. Options: (a) each user gets their own copy of seed exercises in Postgres, or (b) seed exercises have a special `user_id` (e.g., a system user). Option (a) is simpler — on first push, user's seed exercises are inserted with their `user_id`. On pull from another device, they receive these rows. No shared bucket needed.
- **428 existing tests must pass.** The soft-delete `updated_at` fix and schema v6 migration must not break any existing test. The test helper mock doesn't run migrations — test-specific setup needed for v6.

## Common Pitfalls

- **Forgetting to push before pull** — If client pulls first, it may overwrite local changes that haven't been pushed yet. Always push → then pull.
- **Clock skew on LWW** — Client devices may have inaccurate clocks. Mitigation: server records its own `server_now` timestamp on push responses, and client uses `server_now` (not local clock) as the next `last_push_at`. This way, the high-water mark is always in server time.
- **`INSERT OR REPLACE` on `body_weight_entries`** — The partial unique index `(date) WHERE deleted_at IS NULL` means two active entries for the same date are forbidden. If a pulled row has a different ID but the same date as an existing active row, `INSERT OR REPLACE` will fail on the unique constraint (not the PK). Need to handle this table with a SELECT-first approach.
- **Partial push failure** — If the push request sends 7 tables worth of data and the server crashes mid-processing, some tables are updated and others aren't. The client would re-push on retry, which is fine because LWW is idempotent — re-pushing the same rows is harmless. But `last_push_at` shouldn't be updated on failure.
- **Initial full sync race with local writes** — User signs in, full sync starts, user also starts a workout. Local writes during sync could be missed by the push (already started before the write). Mitigated by subsequent incremental syncs catching up. Not a correctness issue, just a freshness delay.
- **Schema v6 migration: exercise not in seed list** — If a user's exercise has the same name as a seed exercise but is marked `is_custom = 1`, the migration should NOT re-ID it. Only re-ID rows where `is_custom = 0`.
- **Sync when signed out** — All sync triggers must check `isSignedIn()` first. Network reconnect events fire regardless of auth state.

## Open Risks

- **Token expiry during extended offline** — User goes offline for days, token may expire server-side. On reconnect, sync gets 401. Must handle: detect 401 from sync endpoint → prompt re-authentication. The auth-client `signIn()` refreshes the token, but auto-refresh isn't implemented. Risk: medium. Mitigation: sync service catches 401 and sets a "needs re-auth" flag that the UI can display (S04 scope).
- **Large initial sync on slow network** — A power user with 5000+ rows doing first sync on cellular could take several seconds. Risk: low (1MB payload). Mitigation: show sync progress in UI (S04 scope). The sync service itself just needs to not timeout.
- **Concurrent sync from two devices** — Two devices push simultaneously. Server applies LWW per row — the last write wins. No data corruption, but one device's changes for the same row may be silently overwritten. Acceptable for single-user training data where concurrent edits to the same row are extremely rare.
- **Re-ID migration on a device with years of data** — The v6 migration re-IDs up to 60 seed exercises and cascades to potentially thousands of workout_sets. Must be fast enough to not cause a noticeable startup delay. SQLite UPDATE with WHERE clause is efficient for this, but should be tested with a large dataset.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Drizzle ORM | `bobmatnyc/claude-mpm-skills@drizzle-orm` (1.7K installs) | available — useful for Drizzle query patterns |
| Better Auth | `better-auth/skills@better-auth-best-practices` (21.9K installs) | available — already noted in M004 research |
| SvelteKit | `spences10/svelte-skills-kit@sveltekit-data-flow` (145 installs) | available — low install count, marginal value |

## Sources

- `@capacitor/network` plugin API: `getStatus()` + `addListener('networkStatusChange')` (source: `references/capacitor-plugins/network/README.md` and `src/definitions.ts`)
- Reference app API route pattern: try/catch with `resolveError()`, `json()` responses (source: `references/capacitor-live-updates/apps/web/src/routes/api/apps/+server.ts`)
- UUID v5 generation via SubtleCrypto SHA-1 — deterministic, zero-dependency, works in browser/Node/native (source: verified via Node.js REPL)
- Drizzle ORM 0.45.1 query API: `db.select().from().where()`, `db.insert().values()`, `db.update().set().where()` (source: installed package in `apps/web/node_modules/drizzle-orm`)
- Soft-delete `updated_at` gap: all 5 repositories' delete methods only set `deleted_at`, not `updated_at` (source: grep of `SET deleted_at` across `apps/mobile/src/lib/db/repositories/`)
- Seed exercises use `crypto.randomUUID()` — 60 exercises, name-based deterministic UUID v5 replacement verified (source: `apps/mobile/src/lib/db/seed/exercises.ts`)
- Data volume estimate: ~5000 rows/year, ~1MB full sync payload (source: table analysis of schema + typical training frequency)

---
id: T01
parent: S01
milestone: M001
provides:
  - SQLite database singleton with lazy initialization and schema migration
  - Exercise domain types with Zod v4 validation schemas
  - Common shared types (UUID, Timestamp, SoftDeletable)
  - Schema DDL with exercises table, schema_version tracking, and indexes
  - Test infrastructure for mocking @capgo/capacitor-fast-sql via sql.js
key_files:
  - apps/mobile/src/lib/db/database.ts
  - apps/mobile/src/lib/db/schema.sql
  - apps/mobile/src/lib/types/exercise.ts
  - apps/mobile/src/lib/types/common.ts
  - apps/mobile/src/lib/db/__tests__/test-helpers.ts
  - apps/mobile/src/lib/db/__tests__/database.test.ts
key_decisions:
  - SQL comment stripping before semicolon-based statement splitting (comments at line start were breaking multi-statement migrations)
  - sql.js used as test-only dependency for in-memory SQLite mock (Capacitor plugin web fallback requires DOM/CDN)
  - getConnectedDatabase() helper extracted to work around TypeScript narrowing limitation with module-level let after await
patterns_established:
  - Database singleton via getDb() — lazy init, connect + migrate on first call, cached thereafter
  - Schema migration via schema_version table — check version on connect, apply DDL if behind, record version
  - Plugin mock pattern for tests — vi.mock at module level in test-helpers.ts, sql.js in-memory DB backing the mock
  - dbExecute/dbQuery helpers that auto-init the database before executing SQL
  - Enum-as-const-object pattern for MuscleGroup and Equipment (TypeScript value + type in one declaration)
observability_surfaces:
  - "[DB] Connecting" / "[DB] Connected" / "[DB] Disconnected" console logs for connection lifecycle
  - "[DB] Applying schema migration" / "[DB] Schema migration applied" / "[DB] Schema up to date" for migration state
  - "[DB] Schema migration failed on statement: <SQL>" with error details for migration failures
  - "[DB] Connection failed" with error message for connection errors
  - dbState() returns { status, error? } for programmatic state inspection
  - dbReady() returns boolean for quick readiness check
  - schema_version table queryable for migration state verification
duration: 1 session
verification_result: passed
completed_at: 2026-03-12
blocker_discovered: false
---

# T01: Set up database layer with schema and migrations

**Built SQLite database singleton with schema migration, exercise types with Zod v4 validation, and test infrastructure with sql.js-backed Capacitor plugin mock — 13 tests passing.**

## What Happened

1. Installed `@capgo/capacitor-fast-sql` and `sql.js` (test-only) in apps/mobile.

2. Created shared types in `common.ts` (UUID, Timestamp, SoftDeletable) and exercise domain types in `exercise.ts` (MuscleGroup/Equipment enum-as-const objects, Exercise interface, exerciseInsertSchema/exerciseUpdateSchema with Zod v4 syntax — `z.uuid()`, `z.enum()`, `z.optional()`, `z.nullable()`).

3. Created `schema.sql` with `schema_version` table (version + applied_at), `exercises` table (UUID PK, name, description, muscle_group, secondary_muscle_groups as JSON text, equipment, is_custom, is_compound, timestamps, soft delete), and indexes on muscle_group, equipment, and name.

4. Created `database.ts` module that uses the `CapgoCapacitorFastSql` plugin interface directly. Exposes: `getDb()` (lazy singleton — connects, applies schema migration if needed), `dbExecute()`, `dbQuery<T>()`, `dbReady()`, `dbState()`, `dbClose()`, `_resetForTesting()`. Schema migration strips SQL comments before splitting by semicolons to avoid breaking multi-statement DDL.

5. Created test helpers (`test-helpers.ts`) with an in-memory sql.js-backed mock of the Capacitor plugin. The mock implements `connect`, `disconnect`, `execute`, `beginTransaction`, `commitTransaction`, `rollbackTransaction` using sql.js's `prepare/step/getAsObject` API. Added `sql-js.d.ts` type declarations since sql.js doesn't ship TypeScript types.

6. Wrote 13 database tests covering: initialization, singleton behavior, connected state reporting, schema_version with version 1, exercises table column verification, index verification, idempotent migration (no re-apply), insert, query, update, soft delete, hard delete, and disconnect/reset.

## Verification

- `pnpm --filter mobile test -- --run` — **13/13 tests pass** (62ms)
- `pnpm --filter mobile check` — **0 errors, 0 warnings** (TypeScript compiles clean)
- Test output confirms: schema created, version tracked at 1, CRUD operations work, soft delete filtering works, singleton behavior verified

### Slice-level verification (partial — T01 is first task):
- `database.test.ts` — PASS (database opens, schema created, version tracked)
- `exercise-repository.test.ts` — NOT YET CREATED (T02 scope)
- Dev server exercise library page — NOT YET CREATED (T04/T05 scope)

## Diagnostics

- **Connection state**: Call `dbState()` to get `{ status: 'idle' | 'connecting' | 'connected' | 'error', error?: string }`
- **Readiness check**: Call `dbReady()` for boolean
- **Migration state**: Query `SELECT version FROM schema_version` after `getDb()`
- **Console logs**: All DB lifecycle events prefixed with `[DB]` — connecting, connected, migration applied/skipped, disconnected, errors
- **Error surfaces**: `getDb()` throws with descriptive message if connection fails; schema migration errors include the failing SQL statement

## Deviations

- Added `sql.js` as dev dependency — plan mentioned "using sql.js directly (loaded via Node.js)" but didn't explicitly list it as a dependency to install.
- Added `sql-js.d.ts` type declarations — sql.js doesn't ship TypeScript types, needed a local declaration file.
- Extracted `getConnectedDatabase()` helper function — TypeScript couldn't narrow module-level `let state` after `await` in `getDb()`. A separate function gives TS a fresh narrowing scope.
- SQL parsing: Changed from `split(';') + filter(!startsWith('--'))` to `strip comment lines first, then split(';')`. The original approach dropped CREATE TABLE statements that had comment lines before them in the same block.

## Known Issues

- Vitest warning about `vi.mock()` not being at top level (it's inside `setupMockDatabase()` in test-helpers.ts). This is by design for reusability, and the mock works correctly since vi.mock is hoisted. May need adjustment when vitest enforces top-level-only in a future version.

## Files Created/Modified

- `apps/mobile/src/lib/types/common.ts` — UUID, Timestamp, SoftDeletable shared types
- `apps/mobile/src/lib/types/exercise.ts` — MuscleGroup/Equipment enums, Exercise interface, Zod insert/update schemas
- `apps/mobile/src/lib/db/schema.sql` — Full DDL: schema_version + exercises tables with indexes
- `apps/mobile/src/lib/db/database.ts` — Singleton DB manager with lazy init, migration, execute/query helpers
- `apps/mobile/src/lib/db/__tests__/sql-js.d.ts` — TypeScript declarations for sql.js module
- `apps/mobile/src/lib/db/__tests__/test-helpers.ts` — Mock CapgoCapacitorFastSql plugin backed by in-memory sql.js
- `apps/mobile/src/lib/db/__tests__/database.test.ts` — 13 tests for DB init, schema, CRUD, lifecycle
- `apps/mobile/package.json` — Added @capgo/capacitor-fast-sql and sql.js dependencies

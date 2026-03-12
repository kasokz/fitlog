---
estimated_steps: 6
estimated_files: 7
---

# T01: Set up database layer with schema and migrations

**Slice:** S01 — Data Layer & Exercise Library
**Milestone:** M001

## Description

Establish the SQLite database foundation that every other task and future slice depends on. Install `@capgo/capacitor-fast-sql`, create a platform-aware database module that abstracts the Capacitor plugin (on web, the plugin uses sql.js + IndexedDB automatically), define the full schema DDL, create TypeScript types, and write tests proving the database layer works.

The critical design challenge: `FastSQL` + `SQLConnection` use HTTP to talk to native SQLite, but the web fallback plugin (`CapgoCapacitorFastSqlWeb`) runs sql.js in-process and implements the same Capacitor plugin interface. Our database module should use the **plugin interface directly** (`CapgoCapacitorFastSql.connect/execute`) rather than the HTTP-based `SQLConnection` class, because the web fallback doesn't run an HTTP server. This gives us a unified API that works on both web and native.

## Steps

1. **Install the plugin:** `pnpm --filter mobile add -D @capgo/capacitor-fast-sql`

2. **Create shared types** in `src/lib/types/common.ts`: UUID type alias, Timestamp type alias, SoftDeletable interface (created_at, updated_at, deleted_at). Create exercise types in `src/lib/types/exercise.ts`: MuscleGroup enum (chest, back, shoulders, biceps, triceps, forearms, quadriceps, hamstrings, glutes, calves, abs, full_body), Equipment enum (barbell, dumbbell, cable, machine, bodyweight, kettlebell, band, other), Exercise interface extending SoftDeletable, and Zod v4 validation schemas (`exerciseInsertSchema`, `exerciseUpdateSchema`).

3. **Create schema DDL** in `src/lib/db/schema.sql`: `schema_version` table (version INTEGER, applied_at TEXT), `exercises` table with columns: id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, muscle_group TEXT NOT NULL, secondary_muscle_groups TEXT (JSON array as string), equipment TEXT NOT NULL, is_custom INTEGER NOT NULL DEFAULT 0, is_compound INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT. Add indexes on muscle_group, equipment, and name.

4. **Create database module** in `src/lib/db/database.ts`: Import `CapgoCapacitorFastSql` from the plugin. Implement `getDb()` as a lazy singleton that calls `CapgoCapacitorFastSql.connect({ database: 'fitlog' })` on first call, then runs schema migration if needed (check schema_version, apply schema.sql if version < 1). Expose `dbExecute(statement, params?)` and `dbQuery(statement, params?)` helpers that use the plugin's `execute()` method directly. Expose `dbReady()` for checking initialization state. Add structured console logging for connection lifecycle.

5. **Create a test-specific database helper** for vitest: Since the Capacitor plugin's web implementation requires a DOM environment (it creates a `<script>` tag for sql.js), create `src/lib/db/__tests__/test-helpers.ts` that provides a lightweight in-memory SQLite mock using sql.js directly (loaded via Node.js, not browser). Mock the `CapgoCapacitorFastSql` plugin methods to use this in-memory database.

6. **Write database tests** in `src/lib/db/__tests__/database.test.ts`: Test that `getDb()` initializes the database and creates the schema. Test that schema_version table has version 1. Test that exercises table exists with correct columns. Test that basic insert/query/update/delete works on the exercises table. Test that calling `getDb()` multiple times returns the same connection (singleton).

## Must-Haves

- [ ] `@capgo/capacitor-fast-sql` installed in apps/mobile
- [ ] `common.ts` types: UUID, Timestamp, SoftDeletable
- [ ] `exercise.ts` types: MuscleGroup enum, Equipment enum, Exercise interface, Zod schemas (v4 syntax)
- [ ] `schema.sql`: exercises table with UUID PK, timestamps, soft delete, indexes
- [ ] `schema_version` table for migration tracking
- [ ] `database.ts`: lazy singleton `getDb()`, schema migration on first open, execute/query helpers
- [ ] Database tests pass in vitest

## Verification

- `pnpm --filter mobile test -- --run` passes all database tests
- Test output shows: schema created, version tracked, basic CRUD works
- TypeScript compiles with no errors: `pnpm --filter mobile check` (ignore paraglide stale warnings)

## Observability Impact

- Signals added/changed: Console logs for DB connection state (connecting → connected, schema version applied), structured as `[DB]` prefixed messages
- How a future agent inspects this: Call `getDb()` and query `SELECT version FROM schema_version` to check migration state; check console output for connection lifecycle
- Failure state exposed: `getDb()` throws with descriptive error if connection fails; schema migration errors include the failing SQL statement

## Inputs

- `references/capacitor-fast-sql/src/` — plugin API reference (definitions.ts, fast-sql.ts, sql-connection.ts, web.ts)
- `references/zod/` — Zod v4 API for validation schemas
- S01-RESEARCH.md — constraints on UUID format, timestamp format, plugin usage patterns

## Expected Output

- `apps/mobile/src/lib/types/common.ts` — shared types used by all future domain modules
- `apps/mobile/src/lib/types/exercise.ts` — Exercise domain types and Zod schemas
- `apps/mobile/src/lib/db/schema.sql` — full DDL for exercises + schema_version tables
- `apps/mobile/src/lib/db/database.ts` — singleton DB manager with migration support
- `apps/mobile/src/lib/db/__tests__/test-helpers.ts` — test utilities for mocking the DB plugin
- `apps/mobile/src/lib/db/__tests__/database.test.ts` — passing tests for DB initialization and schema

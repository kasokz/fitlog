/**
 * Database module — singleton connection manager with schema migration.
 *
 * Uses `@capgo/capacitor-fast-sql` plugin interface directly.
 * On native: HTTP-based protocol to SQLite.
 * On web: sql.js + IndexedDB fallback (same Capacitor plugin interface).
 *
 * @module
 */

import { CapgoCapacitorFastSql } from '@capgo/capacitor-fast-sql';
import type { SQLResult, SQLValue } from '@capgo/capacitor-fast-sql';

import SCHEMA_SQL from './schema.sql?raw';
import { seedExercises } from './seed/exercises.js';

// ── Constants ──

const DB_NAME = 'fitlog';
const CURRENT_SCHEMA_VERSION = 3;

// ── State ──

type DbState =
	| { status: 'idle' }
	| { status: 'connecting' }
	| { status: 'connected'; database: string }
	| { status: 'error'; error: Error };

let state: DbState = { status: 'idle' };
let connectionPromise: Promise<void> | null = null;

// ── Logging ──

function log(message: string, data?: Record<string, unknown>): void {
	const entry = data ? `[DB] ${message} ${JSON.stringify(data)}` : `[DB] ${message}`;
	console.log(entry);
}

function logError(message: string, error: unknown): void {
	const errMsg = error instanceof Error ? error.message : String(error);
	console.error(`[DB] ${message}`, { error: errMsg });
}

// ── Migration ──

async function getSchemaVersion(): Promise<number> {
	try {
		const result = await CapgoCapacitorFastSql.execute({
			database: DB_NAME,
			statement: "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
		});
		if (result.rows.length === 0) return 0;

		const versionResult = await CapgoCapacitorFastSql.execute({
			database: DB_NAME,
			statement: 'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
		});
		if (versionResult.rows.length === 0) return 0;
		return (versionResult.rows[0].version as number) ?? 0;
	} catch {
		return 0;
	}
}

async function applySchema(): Promise<void> {
	const currentVersion = await getSchemaVersion();

	if (currentVersion >= CURRENT_SCHEMA_VERSION) {
		log('Schema up to date', { version: currentVersion });
		return;
	}

	log('Applying schema migration', { from: currentVersion, to: CURRENT_SCHEMA_VERSION });

	// Strip comment lines, then split into individual statements
	const cleaned = SCHEMA_SQL.split('\n')
		.filter((line) => !line.trimStart().startsWith('--'))
		.join('\n');
	const statements = cleaned
		.split(';')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);

	for (const statement of statements) {
		try {
			await CapgoCapacitorFastSql.execute({
				database: DB_NAME,
				statement: statement
			});
		} catch (error) {
			logError(`Schema migration failed on statement: ${statement}`, error);
			throw new Error(
				`Schema migration failed: ${error instanceof Error ? error.message : String(error)}. Statement: ${statement}`
			);
		}
	}

	// Record the migration
	await CapgoCapacitorFastSql.execute({
		database: DB_NAME,
		statement: 'INSERT INTO schema_version (version, applied_at) VALUES (?, ?)',
		params: [CURRENT_SCHEMA_VERSION, new Date().toISOString()]
	});

	log('Schema migration applied', { version: CURRENT_SCHEMA_VERSION });
}

// ── Seed ──

async function seedIfEmpty(): Promise<void> {
	const result = await CapgoCapacitorFastSql.execute({
		database: DB_NAME,
		statement: 'SELECT COUNT(*) as count FROM exercises'
	});
	const count = (result.rows[0]?.count as number) ?? 0;

	if (count === 0) {
		await seedExercises(DB_NAME);
	}
}

// ── Connection ──

async function initializeConnection(): Promise<void> {
	state = { status: 'connecting' };
	log('Connecting');

	try {
		await CapgoCapacitorFastSql.connect({ database: DB_NAME });
		state = { status: 'connected', database: DB_NAME };
		log('Connected', { database: DB_NAME });

		await applySchema();
		await seedIfEmpty();
	} catch (error) {
		const err = error instanceof Error ? error : new Error(String(error));
		state = { status: 'error', error: err };
		logError('Connection failed', error);
		connectionPromise = null;
		throw err;
	}
}

// ── Public API ──

/**
 * Get a ready database connection. Lazily initializes on first call.
 * Returns the database name (used as the connection identifier for execute calls).
 * Subsequent calls return immediately (singleton).
 */
export async function getDb(): Promise<string> {
	if (state.status === 'connected') {
		return state.database;
	}

	if (state.status === 'error') {
		// Reset on error so retry is possible
		state = { status: 'idle' };
		connectionPromise = null;
	}

	if (!connectionPromise) {
		connectionPromise = initializeConnection();
	}

	await connectionPromise;

	return getConnectedDatabase();
}

function getConnectedDatabase(): string {
	if (state.status === 'connected') {
		return state.database;
	}
	throw new Error(`[DB] Unexpected state after init: ${state.status}`);
}

/**
 * Execute a SQL statement that modifies data (INSERT, UPDATE, DELETE, CREATE, etc.).
 * Automatically initializes the database if needed.
 */
export async function dbExecute(statement: string, params?: SQLValue[]): Promise<SQLResult> {
	const database = await getDb();
	return CapgoCapacitorFastSql.execute({ database, statement, params });
}

/**
 * Execute a SQL query that returns rows (SELECT).
 * Automatically initializes the database if needed.
 */
export async function dbQuery<T extends Record<string, SQLValue> = Record<string, SQLValue>>(
	statement: string,
	params?: SQLValue[]
): Promise<T[]> {
	const database = await getDb();
	const result = await CapgoCapacitorFastSql.execute({ database, statement, params });
	return result.rows as T[];
}

/**
 * Check if the database is ready.
 */
export function dbReady(): boolean {
	return state.status === 'connected';
}

/**
 * Get current database state for diagnostics.
 */
export function dbState(): { status: string; error?: string } {
	if (state.status === 'error') {
		return { status: state.status, error: state.error.message };
	}
	return { status: state.status };
}

/**
 * Close the database connection. Primarily used in tests.
 */
export async function dbClose(): Promise<void> {
	if (state.status === 'connected') {
		await CapgoCapacitorFastSql.disconnect({ database: DB_NAME });
		state = { status: 'idle' };
		connectionPromise = null;
		log('Disconnected');
	}
}

/**
 * Reset module state without disconnecting. Used in tests to force re-initialization.
 */
export function _resetForTesting(): void {
	state = { status: 'idle' };
	connectionPromise = null;
}

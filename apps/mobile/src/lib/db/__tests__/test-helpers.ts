/**
 * Test helper: mocks @capgo/capacitor-fast-sql with an in-memory sql.js database.
 *
 * The real Capacitor plugin's web implementation requires a DOM environment
 * (creates <script> tags to load sql.js from CDN). This mock provides the same
 * CapgoCapacitorFastSql plugin interface using sql.js loaded via Node.js.
 */

import initSqlJs from 'sql.js';
import type { BindParams, Database as SqlJsDatabase } from 'sql.js';
import { vi } from 'vitest';

import type { SQLResult, SQLValue } from '@capgo/capacitor-fast-sql';

// ── In-memory database state ──

let db: SqlJsDatabase | null = null;

async function ensureDb(): Promise<SqlJsDatabase> {
	if (!db) {
		const SQL = await initSqlJs();
		db = new SQL.Database();
	}
	return db;
}

function getDb(): SqlJsDatabase {
	if (!db) throw new Error('Database not connected. Call connect() first.');
	return db;
}

// ── Mock plugin implementation ──

const mockPlugin = {
	async connect(_options: { database: string }): Promise<{ port: number; token: string; database: string }> {
		await ensureDb();
		return { port: 0, token: 'test-token', database: _options.database };
	},

	async disconnect(_options: { database: string }): Promise<void> {
		if (db) {
			db.close();
			db = null;
		}
	},

	async getServerInfo(_options: { database: string }): Promise<{ port: number; token: string }> {
		return { port: 0, token: 'test-token' };
	},

	async execute(options: {
		database: string;
		statement: string;
		params?: SQLValue[];
	}): Promise<SQLResult> {
		const database = getDb();
		const stmt = database.prepare(options.statement);

		if (options.params) {
			stmt.bind(options.params as BindParams);
		}

		const rows: Record<string, SQLValue>[] = [];
		while (stmt.step()) {
			const row = stmt.getAsObject() as Record<string, SQLValue>;
			rows.push(row);
		}
		stmt.free();

		// Get rows modified (not perfectly accurate for all cases, but sufficient for tests)
		const changes = database.getRowsModified();

		return {
			rows,
			rowsAffected: changes
		};
	},

	async beginTransaction(options: { database: string }): Promise<void> {
		await this.execute({ database: options.database, statement: 'BEGIN TRANSACTION' });
	},

	async commitTransaction(options: { database: string }): Promise<void> {
		await this.execute({ database: options.database, statement: 'COMMIT' });
	},

	async rollbackTransaction(options: { database: string }): Promise<void> {
		await this.execute({ database: options.database, statement: 'ROLLBACK' });
	},

	async getPluginVersion(): Promise<{ version: string }> {
		return { version: 'test' };
	}
};

// ── Setup / Teardown ──

/**
 * Install the mock before tests. Call in `beforeEach` or `beforeAll`.
 * Returns the mock for assertions.
 */
export function setupMockDatabase(): typeof mockPlugin {
	vi.mock('@capgo/capacitor-fast-sql', () => ({
		CapgoCapacitorFastSql: mockPlugin
	}));

	return mockPlugin;
}

/**
 * Tear down the mock database. Call in `afterEach` or `afterAll`.
 */
export async function teardownMockDatabase(): Promise<void> {
	if (db) {
		db.close();
		db = null;
	}
}

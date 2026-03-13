/**
 * Client-side sync service — push local changes to server, pull remote changes to device.
 *
 * Orchestrates full sync (after sign-in) and incremental sync (on resume/connectivity).
 * Push before pull (always). Server timestamps for high-water marks (not client clock).
 * Errors are caught and logged — sync failure is silent, retried on next trigger.
 *
 * @module
 */

import { Preferences } from '@capacitor/preferences';
import { getStoredToken, isSignedIn, API_BASE_URL } from './auth-client.js';
import { dbQuery, dbExecute } from '../db/database.js';

// ── Constants ──

/**
 * Tables in push order (FK-safe: parents first).
 * Matches server-side SYNC_TABLE_NAMES.
 */
const SYNC_TABLES = [
	'exercises',
	'programs',
	'training_days',
	'exercise_assignments',
	'mesocycles',
	'workout_sessions',
	'workout_sets',
	'body_weight_entries',
] as const;

const PREF_LAST_PUSH = 'sync_last_push_at';
const PREF_LAST_PULL = 'sync_last_pull_at';

// ── Column definitions for upserts (must match schema.sql, no user_id) ──

const TABLE_COLUMNS: Record<string, readonly string[]> = {
	exercises: [
		'id', 'name', 'description', 'muscle_group', 'secondary_muscle_groups',
		'equipment', 'is_custom', 'is_compound', 'created_at', 'updated_at', 'deleted_at',
	],
	programs: [
		'id', 'name', 'description', 'created_at', 'updated_at', 'deleted_at',
	],
	training_days: [
		'id', 'program_id', 'name', 'sort_order', 'created_at', 'updated_at', 'deleted_at',
	],
	exercise_assignments: [
		'id', 'training_day_id', 'exercise_id', 'sort_order', 'target_sets',
		'min_reps', 'max_reps', 'created_at', 'updated_at', 'deleted_at',
	],
	mesocycles: [
		'id', 'program_id', 'weeks_count', 'deload_week_number', 'start_date',
		'current_week', 'created_at', 'updated_at', 'deleted_at',
	],
	workout_sessions: [
		'id', 'program_id', 'training_day_id', 'mesocycle_id', 'mesocycle_week',
		'status', 'started_at', 'completed_at', 'duration_seconds', 'notes',
		'created_at', 'updated_at', 'deleted_at',
	],
	workout_sets: [
		'id', 'session_id', 'exercise_id', 'assignment_id', 'set_number',
		'set_type', 'weight', 'reps', 'rir', 'completed', 'rest_seconds',
		'created_at', 'updated_at', 'deleted_at',
	],
	body_weight_entries: [
		'id', 'date', 'weight_kg', 'created_at', 'updated_at', 'deleted_at',
	],
};

// ── Sync State ──

/**
 * Observable sync state — combines in-memory flags with persisted timestamps.
 */
export interface SyncState {
	isSyncing: boolean;
	lastSyncAt: string | null;
	lastError: string | null;
	lastErrorAt: string | null;
}

/** In-memory sync state (timestamps come from Preferences on read). */
const syncState = {
	isSyncing: false,
	lastError: null as string | null,
	lastErrorAt: null as string | null,
};

/**
 * Read full sync state — merges in-memory flags with persisted Preferences timestamps.
 * The `lastSyncAt` is the later of `sync_last_push_at` and `sync_last_pull_at`.
 */
export async function getSyncState(): Promise<SyncState> {
	const { value: lastPushAt } = await Preferences.get({ key: PREF_LAST_PUSH });
	const { value: lastPullAt } = await Preferences.get({ key: PREF_LAST_PULL });

	let lastSyncAt: string | null = null;
	if (lastPushAt && lastPullAt) {
		lastSyncAt = lastPushAt > lastPullAt ? lastPushAt : lastPullAt;
	} else {
		lastSyncAt = lastPushAt ?? lastPullAt;
	}

	return {
		isSyncing: syncState.isSyncing,
		lastSyncAt,
		lastError: syncState.lastError,
		lastErrorAt: syncState.lastErrorAt,
	};
}

/**
 * Clear all sync state — removes Preferences keys and resets in-memory state.
 * Call on sign-out to prevent cross-account timestamp leaks.
 */
export async function clearSyncState(): Promise<void> {
	await Preferences.remove({ key: PREF_LAST_PUSH });
	await Preferences.remove({ key: PREF_LAST_PULL });
	syncState.isSyncing = false;
	syncState.lastError = null;
	syncState.lastErrorAt = null;
	log('Sync state cleared');
}

/**
 * UI-callable sync trigger — runs incremental sync.
 * Use for "Sync Now" button in settings.
 */
export async function triggerSync(): Promise<void> {
	await incrementalSync();
}

// ── Logging ──

function log(message: string): void {
	console.log(`[Sync] ${message}`);
}

function logError(message: string, error: unknown): void {
	const msg = error instanceof Error ? error.message : String(error);
	console.error(`[Sync] ${message}`, { error: msg });
	// Capture error in sync state for observability
	syncState.lastError = msg;
	syncState.lastErrorAt = new Date().toISOString();
}

// ── Push ──

/**
 * Query local changes since `lastPushAt` and POST them to the server.
 * If `lastPushAt` is null, pushes all rows (full push).
 *
 * @returns `server_now` timestamp on success, `null` on failure.
 */
export async function pushChanges(lastPushAt: string | null): Promise<string | null> {
	try {
		const token = await getStoredToken();
		if (!token) {
			log('Push skipped — no auth token');
			return null;
		}

		const tables: Record<string, Record<string, unknown>[]> = {};
		let totalRows = 0;

		for (const table of SYNC_TABLES) {
			let rows: Record<string, unknown>[];
			if (lastPushAt) {
				rows = await dbQuery(`SELECT * FROM ${table} WHERE updated_at > ?`, [lastPushAt]);
			} else {
				rows = await dbQuery(`SELECT * FROM ${table}`);
			}
			if (rows.length > 0) {
				tables[table] = rows;
				totalRows += rows.length;
			}
		}

		if (totalRows === 0) {
			log('Push skipped — no changes');
			return null;
		}

		const response = await fetch(`${API_BASE_URL}/api/sync/push`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ tables }),
		});

		if (!response.ok) {
			const errorBody = await response.json().catch(() => ({}));
			logError(`Push failed (${response.status})`, errorBody.message || response.statusText);
			return null;
		}

		const result = await response.json();
		log(`Push complete — ${totalRows} rows sent, ${result.accepted} accepted, ${result.conflicts} conflicts`);
		return result.server_now as string;
	} catch (error) {
		logError('Push error', error);
		return null;
	}
}

// ── Pull ──

/**
 * POST to the server to get changes since `lastPullAt`, then upsert locally.
 * If `lastPullAt` is null, pulls all rows (full pull).
 *
 * @returns `server_now` timestamp on success, `null` on failure.
 */
export async function pullChanges(lastPullAt: string | null): Promise<string | null> {
	try {
		const token = await getStoredToken();
		if (!token) {
			log('Pull skipped — no auth token');
			return null;
		}

		const response = await fetch(`${API_BASE_URL}/api/sync/pull`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ last_pull_at: lastPullAt || '' }),
		});

		if (!response.ok) {
			const errorBody = await response.json().catch(() => ({}));
			logError(`Pull failed (${response.status})`, errorBody.message || response.statusText);
			return null;
		}

		const result = await response.json();
		const pulledTables = result.tables as Record<string, Record<string, unknown>[]>;
		let totalUpserted = 0;

		for (const [tableName, rows] of Object.entries(pulledTables)) {
			const columns = TABLE_COLUMNS[tableName];
			if (!columns || !Array.isArray(rows)) continue;

			for (const row of rows) {
				if (tableName === 'body_weight_entries') {
					await upsertBodyWeightEntry(row, columns);
				} else {
					await upsertRow(tableName, row, columns);
				}
				totalUpserted++;
			}
		}

		log(`Pull complete — ${totalUpserted} rows upserted`);
		return result.server_now as string;
	} catch (error) {
		logError('Pull error', error);
		return null;
	}
}

/**
 * Standard upsert: INSERT OR REPLACE.
 * Works for all tables except body_weight_entries.
 */
async function upsertRow(
	table: string,
	row: Record<string, unknown>,
	columns: readonly string[],
): Promise<void> {
	const placeholders = columns.map(() => '?').join(', ');
	const values = columns.map((col) => row[col] ?? null);
	await dbExecute(
		`INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
		values,
	);
}

/**
 * Special upsert for body_weight_entries — handles partial unique index on (date) WHERE deleted_at IS NULL.
 *
 * Logic:
 * 1. If row with same `id` exists → UPDATE it
 * 2. If no id match, check for active row with same date → UPDATE if pulled row is newer
 * 3. Otherwise → INSERT
 */
async function upsertBodyWeightEntry(
	row: Record<string, unknown>,
	columns: readonly string[],
): Promise<void> {
	const rowId = row.id as string;
	const rowDate = row.date as string;
	const rowUpdatedAt = row.updated_at as string;

	// Check if row with this id already exists
	const existing = await dbQuery<{ id: string; updated_at: string }>(
		'SELECT id, updated_at FROM body_weight_entries WHERE id = ?',
		[rowId],
	);

	if (existing.length > 0) {
		// Update existing row by id
		const setClauses = columns
			.filter((col) => col !== 'id')
			.map((col) => `${col} = ?`)
			.join(', ');
		const values = columns.filter((col) => col !== 'id').map((col) => row[col] ?? null);
		values.push(rowId);
		await dbExecute(
			`UPDATE body_weight_entries SET ${setClauses} WHERE id = ?`,
			values,
		);
		return;
	}

	// Check for active entry with the same date
	const dateConflict = await dbQuery<{ id: string; updated_at: string }>(
		'SELECT id, updated_at FROM body_weight_entries WHERE date = ? AND deleted_at IS NULL',
		[rowDate],
	);

	if (dateConflict.length > 0) {
		const conflictUpdatedAt = dateConflict[0].updated_at;
		if (rowUpdatedAt > conflictUpdatedAt) {
			// Pulled row is newer — update the conflicting row
			const conflictId = dateConflict[0].id;
			const setClauses = columns
				.map((col) => `${col} = ?`)
				.join(', ');
			const values = columns.map((col) => row[col] ?? null);
			values.push(conflictId);
			await dbExecute(
				`UPDATE body_weight_entries SET ${setClauses} WHERE id = ?`,
				values,
			);
		}
		// If conflict row is newer or same, skip silently
		return;
	}

	// No conflict — INSERT
	const placeholders = columns.map(() => '?').join(', ');
	const values = columns.map((col) => row[col] ?? null);
	await dbExecute(
		`INSERT INTO body_weight_entries (${columns.join(', ')}) VALUES (${placeholders})`,
		values,
	);
}

// ── Orchestration ──

/**
 * Full sync — push everything, then pull everything.
 * Used after sign-in when no prior sync state exists.
 */
export async function fullSync(): Promise<void> {
	if (!(await isSignedIn())) return;

	syncState.isSyncing = true;
	// Clear previous error — logError will re-set if push/pull fails
	syncState.lastError = null;
	syncState.lastErrorAt = null;
	log('Full sync starting');

	try {
		const pushResult = await pushChanges(null);
		if (pushResult) {
			await Preferences.set({ key: PREF_LAST_PUSH, value: pushResult });
		}

		const pullResult = await pullChanges(null);
		if (pullResult) {
			await Preferences.set({ key: PREF_LAST_PULL, value: pullResult });
		}

		log('Full sync complete');
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		syncState.lastError = msg;
		syncState.lastErrorAt = new Date().toISOString();
		logError('Full sync failed', error);
	} finally {
		syncState.isSyncing = false;
	}
}

/**
 * Incremental sync — push and pull only changes since last sync.
 * Used on app resume and connectivity restore.
 */
export async function incrementalSync(): Promise<void> {
	if (!(await isSignedIn())) return;

	syncState.isSyncing = true;
	// Clear previous error — logError will re-set if push/pull fails
	syncState.lastError = null;
	syncState.lastErrorAt = null;
	log('Incremental sync starting');

	try {
		const { value: lastPushAt } = await Preferences.get({ key: PREF_LAST_PUSH });
		const { value: lastPullAt } = await Preferences.get({ key: PREF_LAST_PULL });

		const pushResult = await pushChanges(lastPushAt);
		if (pushResult) {
			await Preferences.set({ key: PREF_LAST_PUSH, value: pushResult });
		}

		const pullResult = await pullChanges(lastPullAt);
		if (pullResult) {
			await Preferences.set({ key: PREF_LAST_PULL, value: pullResult });
		}

		log('Incremental sync complete');
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		syncState.lastError = msg;
		syncState.lastErrorAt = new Date().toISOString();
		logError('Incremental sync failed', error);
	} finally {
		syncState.isSyncing = false;
	}
}

/**
 * POST /api/sync/push — receive client rows and apply LWW (last-write-wins per row).
 *
 * Body: { tables: Record<string, Row[]> }
 * Response: { accepted: number, conflicts: number, server_now: string }
 *
 * Auth: Bearer token or session cookie (resolved by hooks.server.ts + handleApiAuth).
 *
 * @module
 */

import { json } from '@sveltejs/kit';
import { sql, type SQL, type SQLChunk } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { requireUserId } from '$lib/server/auth';
import { resolveError } from '$lib/server/error';
import { db } from '$lib/server/db';
import { SYNC_TABLES } from '$lib/server/sync/tables';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const userId = requireUserId();
		const body = await request.json();

		if (!body.tables || typeof body.tables !== 'object') {
			return json(
				{ status: 400, code: 'bad_request', message: 'Missing tables object' },
				{ status: 400 }
			);
		}

		let accepted = 0;
		let conflicts = 0;

		for (const [tableName, rows] of Object.entries(body.tables)) {
			const tableDef = SYNC_TABLES[tableName];
			if (!tableDef) {
				console.warn(`[Sync] Push: unknown table "${tableName}", skipping`);
				continue;
			}

			if (!Array.isArray(rows)) continue;

			for (const row of rows as Record<string, unknown>[]) {
				if (!row.id || !row.updated_at) {
					console.warn(`[Sync] Push: row missing id or updated_at in ${tableName}, skipping`);
					continue;
				}

				const result = await pushRow(userId, tableName, tableDef, row);
				if (result === 'accepted') {
					accepted++;
				} else {
					conflicts++;
				}
			}
		}

		const serverNow = new Date().toISOString();
		console.log(
			`[Sync] Push complete for user ${userId}: ${accepted} accepted, ${conflicts} conflicts`
		);

		return json({ accepted, conflicts, server_now: serverNow });
	} catch (err) {
		const error = resolveError(err);
		return json(
			{ status: error.status, code: error.code, message: error.message },
			{ status: error.status }
		);
	}
};

type PushResult = 'accepted' | 'conflict';

/**
 * Push a single row with LWW logic.
 * - No existing row → INSERT
 * - Client updated_at > server updated_at → UPDATE
 * - Otherwise → conflict (skip)
 *
 * For body_weight_entries, handles (user_id, date) unique constraint:
 * if INSERT fails on unique violation, falls back to UPDATE-if-newer keyed on (user_id, date).
 */
async function pushRow(
	userId: string,
	tableName: string,
	tableDef: (typeof SYNC_TABLES)[string],
	row: Record<string, unknown>
): Promise<PushResult> {
	const rowId = row.id as string;
	const clientUpdatedAt = row.updated_at as string;

	// Check for existing row by id + user_id
	const existing = await db.execute(
		sql`SELECT id, updated_at FROM ${sql.identifier(tableName)} WHERE id = ${rowId} AND user_id = ${userId} LIMIT 1`
	);

	if (existing.length > 0) {
		// Row exists — LWW check
		const serverUpdatedAt = existing[0].updated_at as string;
		if (clientUpdatedAt > serverUpdatedAt) {
			// Client wins — UPDATE
			const setClauses = buildSetClauses(tableDef, row);
			await db.execute(
				sql`UPDATE ${sql.identifier(tableName)} SET ${setClauses} WHERE id = ${rowId} AND user_id = ${userId}`
			);
			return 'accepted';
		}
		return 'conflict';
	}

	// No existing row — INSERT
	try {
		const { columnsSql, valuesSql } = buildInsertParts(tableDef, row, userId);
		await db.execute(
			sql`INSERT INTO ${sql.identifier(tableName)} (${columnsSql}) VALUES (${valuesSql})`
		);
		return 'accepted';
	} catch (err: unknown) {
		// Handle body_weight_entries (user_id, date) unique constraint violation
		if (tableName === 'body_weight_entries' && isUniqueViolation(err)) {
			const date = row.date as string;
			const existingByDate = await db.execute(
				sql`SELECT id, updated_at FROM ${sql.identifier(tableName)} WHERE user_id = ${userId} AND date = ${date} LIMIT 1`
			);

			if (existingByDate.length > 0) {
				const serverUpdatedAt = existingByDate[0].updated_at as string;
				if (clientUpdatedAt > serverUpdatedAt) {
					const setClauses = buildSetClauses(tableDef, row);
					await db.execute(
						sql`UPDATE ${sql.identifier(tableName)} SET ${setClauses} WHERE user_id = ${userId} AND date = ${date}`
					);
					return 'accepted';
				}
				return 'conflict';
			}
		}
		throw err;
	}
}

/**
 * Build a parameterized SET clause for UPDATE.
 * Only includes columns in the table's pushColumns (minus id — never update PK).
 */
function buildSetClauses(
	tableDef: (typeof SYNC_TABLES)[string],
	row: Record<string, unknown>
): SQL {
	const parts: SQL[] = [];
	for (const col of tableDef.pushColumns) {
		if (col === 'id') continue;
		if (col in row) {
			const value = row[col];
			if (parts.length > 0) {
				parts.push(sql`, ${sql.identifier(col)} = ${value ?? null}`);
			} else {
				parts.push(sql`${sql.identifier(col)} = ${value ?? null}`);
			}
		}
	}
	return sql.join(parts, sql.raw(''));
}

/**
 * Build parameterized INSERT columns and values from row data + server-attached user_id.
 */
function buildInsertParts(
	tableDef: (typeof SYNC_TABLES)[string],
	row: Record<string, unknown>,
	userId: string
): { columnsSql: SQL; valuesSql: SQL } {
	const cols: SQLChunk[] = [sql.identifier('user_id')];
	const vals: SQLChunk[] = [sql`${userId}`];

	for (const col of tableDef.pushColumns) {
		if (col in row) {
			cols.push(sql.identifier(col));
			vals.push(sql`${row[col] ?? null}`);
		}
	}

	return {
		columnsSql: sql.join(cols, sql.raw(', ')),
		valuesSql: sql.join(vals, sql.raw(', '))
	};
}

/** Check if an error is a Postgres unique constraint violation (code 23505). */
function isUniqueViolation(err: unknown): boolean {
	return (
		typeof err === 'object' &&
		err !== null &&
		'code' in err &&
		(err as { code: string }).code === '23505'
	);
}

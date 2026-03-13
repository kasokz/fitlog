/**
 * POST /api/sync/pull — return rows newer than the client's last pull timestamp.
 *
 * Body: { last_pull_at: string } (ISO timestamp, or empty/null for full pull)
 * Response: { tables: Record<string, Row[]>, server_now: string }
 *
 * Auth: Bearer token or session cookie (resolved by hooks.server.ts + handleApiAuth).
 * user_id is stripped from response rows (client doesn't have user_id column).
 *
 * @module
 */

import { json } from "@sveltejs/kit";
import { sql } from "drizzle-orm";
import type { RequestHandler } from "./$types";
import { requireUserId } from "$lib/server/auth";
import { resolveError } from "$lib/server/error";
import { db } from "$lib/server/db";
import { SYNC_TABLES, SYNC_TABLE_NAMES } from "$lib/server/sync/tables";

export const POST: RequestHandler = async ({ request }) => {
	try {
		const userId = requireUserId();
		const body = await request.json();

		const lastPullAt: string | null = body.last_pull_at || null;

		const tables: Record<string, Record<string, unknown>[]> = {};
		let totalRows = 0;

		for (const tableName of SYNC_TABLE_NAMES) {
			let rows: Record<string, unknown>[];

			if (lastPullAt) {
				// Incremental pull: only rows updated after last_pull_at
				rows = await db.execute(
					sql`SELECT * FROM ${sql.identifier(tableName)} WHERE user_id = ${userId} AND updated_at > ${lastPullAt}`,
				);
			} else {
				// Full pull: all rows for this user
				rows = await db.execute(
					sql`SELECT * FROM ${sql.identifier(tableName)} WHERE user_id = ${userId}`,
				);
			}

			// Strip user_id from response rows
			const stripped = rows.map((row) => {
				const { user_id: _, ...rest } = row;
				return rest;
			});

			if (stripped.length > 0) {
				tables[tableName] = stripped;
				totalRows += stripped.length;
			}
		}

		const serverNow = new Date().toISOString();
		console.log(
			`[Sync] Pull complete for user ${userId}: ${totalRows} rows across ${Object.keys(tables).length} tables` +
				(lastPullAt ? ` (since ${lastPullAt})` : " (full pull)"),
		);

		return json({ tables, server_now: serverNow });
	} catch (err) {
		const error = resolveError(err);
		return json(
			{ status: error.status, code: error.code, message: error.message },
			{ status: error.status },
		);
	}
};

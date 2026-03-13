import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──

vi.mock("$app/server", () => ({
	getRequestEvent: vi.fn(),
}));

vi.mock("$app/environment", () => ({
	building: true,
}));

vi.mock("$env/dynamic/private", () => ({
	env: {},
}));

// Track all SQL executions
const mockExecute = vi.fn();

vi.mock("$lib/server/db", () => ({
	db: {
		execute: (...args: unknown[]) => mockExecute(...args),
	},
}));

vi.mock("$lib/server/db/app.schema", () => ({
	exercises: { _: { name: "exercises" } },
	programs: { _: { name: "programs" } },
	trainingDays: { _: { name: "training_days" } },
	exerciseAssignments: { _: { name: "exercise_assignments" } },
	mesocycles: { _: { name: "mesocycles" } },
	workoutSessions: { _: { name: "workout_sessions" } },
	workoutSets: { _: { name: "workout_sets" } },
	bodyWeightEntries: { _: { name: "body_weight_entries" } },
}));

import { getRequestEvent } from "$app/server";

// ── Helpers ──

function makeRequest(body: unknown): Request {
	return new Request("http://localhost/api/sync/push", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

function setAuth(userId: string) {
	vi.mocked(getRequestEvent).mockReturnValue({
		locals: { user: { id: userId } },
	} as any);
}

function setNoAuth() {
	vi.mocked(getRequestEvent).mockReturnValue({
		locals: {},
	} as any);
}

// ── Tests ──

describe("POST /api/sync/push", () => {
	let POST: any;

	beforeEach(async () => {
		vi.clearAllMocks();
		mockExecute.mockReset();
		// Dynamic import to pick up fresh mocks
		const mod = await import("../push/+server");
		POST = mod.POST;
	});

	it("returns 401 for unauthenticated requests", async () => {
		setNoAuth();
		const response = await POST({ request: makeRequest({ tables: {} }) });
		const body = await response.json();
		expect(response.status).toBe(401);
		expect(body.code).toBe("unauthorized");
	});

	it("returns 400 for missing tables object", async () => {
		setAuth("user-1");
		const response = await POST({ request: makeRequest({}) });
		const body = await response.json();
		expect(response.status).toBe(400);
		expect(body.code).toBe("bad_request");
	});

	it("inserts new rows when no existing row found", async () => {
		setAuth("user-1");
		// SELECT returns empty (no existing row)
		mockExecute.mockResolvedValueOnce([]);
		// INSERT succeeds
		mockExecute.mockResolvedValueOnce([]);

		const response = await POST({
			request: makeRequest({
				tables: {
					programs: [
						{
							id: "prog-1",
							name: "Push Pull Legs",
							description: "A PPL program",
							created_at: "2025-01-01T00:00:00.000Z",
							updated_at: "2025-01-01T00:00:00.000Z",
							deleted_at: null,
						},
					],
				},
			}),
		});

		const body = await response.json();
		expect(response.status).toBe(200);
		expect(body.accepted).toBe(1);
		expect(body.conflicts).toBe(0);
		expect(body.server_now).toBeTruthy();

		// First call: SELECT to check existing
		expect(mockExecute).toHaveBeenCalledTimes(2);
	});

	it("updates row when client updated_at is newer (LWW: client wins)", async () => {
		setAuth("user-1");
		// SELECT returns existing row with older updated_at
		mockExecute.mockResolvedValueOnce([
			{ id: "prog-1", updated_at: "2025-01-01T00:00:00.000Z" },
		]);
		// UPDATE succeeds
		mockExecute.mockResolvedValueOnce([]);

		const response = await POST({
			request: makeRequest({
				tables: {
					programs: [
						{
							id: "prog-1",
							name: "Updated Name",
							description: "Updated",
							created_at: "2025-01-01T00:00:00.000Z",
							updated_at: "2025-06-01T00:00:00.000Z", // newer than server
							deleted_at: null,
						},
					],
				},
			}),
		});

		const body = await response.json();
		expect(response.status).toBe(200);
		expect(body.accepted).toBe(1);
		expect(body.conflicts).toBe(0);
		// SELECT + UPDATE = 2 calls
		expect(mockExecute).toHaveBeenCalledTimes(2);
	});

	it("skips row when server updated_at is newer (LWW: server wins → conflict)", async () => {
		setAuth("user-1");
		// SELECT returns existing row with newer updated_at
		mockExecute.mockResolvedValueOnce([
			{ id: "prog-1", updated_at: "2025-12-01T00:00:00.000Z" },
		]);

		const response = await POST({
			request: makeRequest({
				tables: {
					programs: [
						{
							id: "prog-1",
							name: "Old Name",
							description: "Old",
							created_at: "2025-01-01T00:00:00.000Z",
							updated_at: "2025-06-01T00:00:00.000Z", // older than server
							deleted_at: null,
						},
					],
				},
			}),
		});

		const body = await response.json();
		expect(response.status).toBe(200);
		expect(body.accepted).toBe(0);
		expect(body.conflicts).toBe(1);
		// Only SELECT, no UPDATE
		expect(mockExecute).toHaveBeenCalledTimes(1);
	});

	it("skips row when timestamps are equal (LWW: tie → server wins)", async () => {
		setAuth("user-1");
		const sameTime = "2025-06-01T00:00:00.000Z";
		mockExecute.mockResolvedValueOnce([{ id: "prog-1", updated_at: sameTime }]);

		const response = await POST({
			request: makeRequest({
				tables: {
					programs: [
						{
							id: "prog-1",
							name: "Same",
							description: null,
							created_at: sameTime,
							updated_at: sameTime,
							deleted_at: null,
						},
					],
				},
			}),
		});

		const body = await response.json();
		expect(body.accepted).toBe(0);
		expect(body.conflicts).toBe(1);
	});

	it("counts accepted and conflicts across multiple rows", async () => {
		setAuth("user-1");
		// Row 1: new (no existing)
		mockExecute.mockResolvedValueOnce([]); // SELECT
		mockExecute.mockResolvedValueOnce([]); // INSERT
		// Row 2: conflict (server newer)
		mockExecute.mockResolvedValueOnce([
			{ id: "prog-2", updated_at: "2099-01-01T00:00:00.000Z" },
		]);
		// Row 3: update (client newer)
		mockExecute.mockResolvedValueOnce([
			{ id: "prog-3", updated_at: "2020-01-01T00:00:00.000Z" },
		]);
		mockExecute.mockResolvedValueOnce([]); // UPDATE

		const response = await POST({
			request: makeRequest({
				tables: {
					programs: [
						{ id: "prog-1", name: "New", created_at: "2025-01-01T00:00:00.000Z", updated_at: "2025-01-01T00:00:00.000Z", deleted_at: null },
						{ id: "prog-2", name: "Conflict", created_at: "2025-01-01T00:00:00.000Z", updated_at: "2025-06-01T00:00:00.000Z", deleted_at: null },
						{ id: "prog-3", name: "Updated", created_at: "2025-01-01T00:00:00.000Z", updated_at: "2025-06-01T00:00:00.000Z", deleted_at: null },
					],
				},
			}),
		});

		const body = await response.json();
		expect(body.accepted).toBe(2); // new + update
		expect(body.conflicts).toBe(1); // server newer
	});

	it("skips unknown table names gracefully", async () => {
		setAuth("user-1");

		const response = await POST({
			request: makeRequest({
				tables: {
					nonexistent_table: [
						{ id: "x", updated_at: "2025-01-01T00:00:00.000Z" },
					],
				},
			}),
		});

		const body = await response.json();
		expect(response.status).toBe(200);
		expect(body.accepted).toBe(0);
		expect(body.conflicts).toBe(0);
	});

	it("skips rows missing id or updated_at", async () => {
		setAuth("user-1");

		const response = await POST({
			request: makeRequest({
				tables: {
					programs: [
						{ name: "No ID" }, // missing id and updated_at
						{ id: "x" }, // missing updated_at
					],
				},
			}),
		});

		const body = await response.json();
		expect(body.accepted).toBe(0);
		expect(body.conflicts).toBe(0);
	});

	it("handles body_weight_entries unique constraint violation with fallback UPDATE", async () => {
		setAuth("user-1");
		// SELECT by id: no existing row
		mockExecute.mockResolvedValueOnce([]);
		// INSERT fails with unique violation (user_id, date)
		const uniqueError = new Error("unique_violation");
		(uniqueError as any).code = "23505";
		mockExecute.mockRejectedValueOnce(uniqueError);
		// Fallback SELECT by (user_id, date): existing with older timestamp
		mockExecute.mockResolvedValueOnce([
			{ id: "bw-old", updated_at: "2025-01-01T00:00:00.000Z" },
		]);
		// Fallback UPDATE
		mockExecute.mockResolvedValueOnce([]);

		const response = await POST({
			request: makeRequest({
				tables: {
					body_weight_entries: [
						{
							id: "bw-new",
							date: "2025-06-15",
							weight_kg: 80.5,
							created_at: "2025-06-15T08:00:00.000Z",
							updated_at: "2025-06-15T08:00:00.000Z",
							deleted_at: null,
						},
					],
				},
			}),
		});

		const body = await response.json();
		expect(body.accepted).toBe(1);
		expect(body.conflicts).toBe(0);
		// SELECT(id) + INSERT(fail) + SELECT(date) + UPDATE = 4 calls
		expect(mockExecute).toHaveBeenCalledTimes(4);
	});

	it("returns server_now timestamp in ISO format", async () => {
		setAuth("user-1");

		const response = await POST({ request: makeRequest({ tables: {} }) });
		const body = await response.json();

		expect(body.server_now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
	});
});

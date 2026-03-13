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
	return new Request("http://localhost/api/sync/pull", {
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

/** Total number of syncable tables (8). */
const TABLE_COUNT = 8;

// ── Tests ──

describe("POST /api/sync/pull", () => {
	let POST: any;

	beforeEach(async () => {
		vi.clearAllMocks();
		mockExecute.mockReset();
		const mod = await import("../pull/+server");
		POST = mod.POST;
	});

	it("returns 401 for unauthenticated requests", async () => {
		setNoAuth();
		const response = await POST({ request: makeRequest({ last_pull_at: "" }) });
		const body = await response.json();
		expect(response.status).toBe(401);
		expect(body.code).toBe("unauthorized");
	});

	it("returns all user rows on full pull (empty last_pull_at)", async () => {
		setAuth("user-1");

		// Mock: exercises table has 2 rows, rest empty
		const exerciseRows = [
			{ id: "ex-1", user_id: "user-1", name: "Bench Press", updated_at: "2025-01-01T00:00:00.000Z" },
			{ id: "ex-2", user_id: "user-1", name: "Squat", updated_at: "2025-01-02T00:00:00.000Z" },
		];
		mockExecute.mockResolvedValueOnce(exerciseRows); // exercises
		for (let i = 1; i < TABLE_COUNT; i++) {
			mockExecute.mockResolvedValueOnce([]); // remaining tables
		}

		const response = await POST({ request: makeRequest({ last_pull_at: "" }) });
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.tables.exercises).toHaveLength(2);
		expect(body.server_now).toBeTruthy();

		// All 8 tables queried
		expect(mockExecute).toHaveBeenCalledTimes(TABLE_COUNT);
	});

	it("returns all user rows on full pull (null last_pull_at)", async () => {
		setAuth("user-1");

		for (let i = 0; i < TABLE_COUNT; i++) {
			mockExecute.mockResolvedValueOnce([]);
		}

		const response = await POST({
			request: makeRequest({ last_pull_at: null }),
		});

		const body = await response.json();
		expect(response.status).toBe(200);
		// No tables with data → tables object exists but may be empty
		expect(body.tables).toBeDefined();
	});

	it("returns only rows after last_pull_at for incremental pull", async () => {
		setAuth("user-1");

		const programRows = [
			{
				id: "prog-1",
				user_id: "user-1",
				name: "New Program",
				description: null,
				created_at: "2025-06-01T00:00:00.000Z",
				updated_at: "2025-06-01T00:00:00.000Z",
				deleted_at: null,
			},
		];

		// exercises: empty, programs: 1 row, rest: empty
		mockExecute.mockResolvedValueOnce([]); // exercises
		mockExecute.mockResolvedValueOnce(programRows); // programs
		for (let i = 2; i < TABLE_COUNT; i++) {
			mockExecute.mockResolvedValueOnce([]);
		}

		const response = await POST({
			request: makeRequest({ last_pull_at: "2025-05-01T00:00:00.000Z" }),
		});

		const body = await response.json();
		expect(response.status).toBe(200);
		expect(body.tables.programs).toHaveLength(1);
		expect(body.tables.programs[0].name).toBe("New Program");
		// Exercises not in response (empty)
		expect(body.tables.exercises).toBeUndefined();
	});

	it("strips user_id from response rows", async () => {
		setAuth("user-1");

		mockExecute.mockResolvedValueOnce([
			{
				id: "ex-1",
				user_id: "user-1",
				name: "Bench Press",
				description: "Test",
				muscle_group: "chest",
				secondary_muscle_groups: null,
				equipment: "barbell",
				is_custom: 0,
				is_compound: 1,
				created_at: "2025-01-01T00:00:00.000Z",
				updated_at: "2025-01-01T00:00:00.000Z",
				deleted_at: null,
			},
		]);
		for (let i = 1; i < TABLE_COUNT; i++) {
			mockExecute.mockResolvedValueOnce([]);
		}

		const response = await POST({ request: makeRequest({ last_pull_at: "" }) });
		const body = await response.json();

		expect(body.tables.exercises).toHaveLength(1);
		// user_id must NOT be in the response
		expect(body.tables.exercises[0].user_id).toBeUndefined();
		// Other fields should be present
		expect(body.tables.exercises[0].id).toBe("ex-1");
		expect(body.tables.exercises[0].name).toBe("Bench Press");
	});

	it("omits empty tables from response", async () => {
		setAuth("user-1");

		// Only programs has data
		mockExecute.mockResolvedValueOnce([]); // exercises
		mockExecute.mockResolvedValueOnce([
			{ id: "prog-1", user_id: "user-1", name: "PPL", updated_at: "2025-01-01T00:00:00.000Z" },
		]); // programs
		for (let i = 2; i < TABLE_COUNT; i++) {
			mockExecute.mockResolvedValueOnce([]);
		}

		const response = await POST({ request: makeRequest({ last_pull_at: "" }) });
		const body = await response.json();

		expect(Object.keys(body.tables)).toEqual(["programs"]);
	});

	it("returns server_now timestamp in ISO format", async () => {
		setAuth("user-1");
		for (let i = 0; i < TABLE_COUNT; i++) {
			mockExecute.mockResolvedValueOnce([]);
		}

		const response = await POST({ request: makeRequest({ last_pull_at: "" }) });
		const body = await response.json();

		expect(body.server_now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
	});

	it("handles multiple tables with data", async () => {
		setAuth("user-1");

		mockExecute.mockResolvedValueOnce([
			{ id: "ex-1", user_id: "user-1", name: "Bench Press", updated_at: "2025-01-01T00:00:00.000Z" },
		]); // exercises
		mockExecute.mockResolvedValueOnce([
			{ id: "prog-1", user_id: "user-1", name: "PPL", updated_at: "2025-01-01T00:00:00.000Z" },
		]); // programs
		for (let i = 2; i < TABLE_COUNT; i++) {
			mockExecute.mockResolvedValueOnce([]);
		}

		const response = await POST({ request: makeRequest({ last_pull_at: "" }) });
		const body = await response.json();

		expect(body.tables.exercises).toHaveLength(1);
		expect(body.tables.programs).toHaveLength(1);
		// user_id stripped from both
		expect(body.tables.exercises[0].user_id).toBeUndefined();
		expect(body.tables.programs[0].user_id).toBeUndefined();
	});
});

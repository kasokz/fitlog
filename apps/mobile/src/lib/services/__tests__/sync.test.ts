import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock @capacitor/preferences ──

const mockStorage = new Map<string, string>();

vi.mock('@capacitor/preferences', () => ({
	Preferences: {
		async get(options: { key: string }): Promise<{ value: string | null }> {
			return { value: mockStorage.get(options.key) ?? null };
		},
		async set(options: { key: string; value: string }): Promise<void> {
			mockStorage.set(options.key, options.value);
		},
		async remove(options: { key: string }): Promise<void> {
			mockStorage.delete(options.key);
		},
	},
}));

// ── Mock auth-client ──

const mockIsSignedIn = vi.fn<() => Promise<boolean>>();
const mockGetStoredToken = vi.fn<() => Promise<string | null>>();

vi.mock('../auth-client.js', () => ({
	isSignedIn: () => mockIsSignedIn(),
	getStoredToken: () => mockGetStoredToken(),
	API_BASE_URL: 'http://test-api.local',
}));

// ── Mock database ──

const mockDbQuery = vi.fn<(stmt: string, params?: unknown[]) => Promise<Record<string, unknown>[]>>();
const mockDbExecute = vi.fn<(stmt: string, params?: unknown[]) => Promise<unknown>>();

vi.mock('../../db/database.js', () => ({
	dbQuery: (stmt: string, params?: unknown[]) => mockDbQuery(stmt, params),
	dbExecute: (stmt: string, params?: unknown[]) => mockDbExecute(stmt, params),
}));

// ── Mock fetch ──

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ── Import module under test ──

const { pushChanges, pullChanges, fullSync, incrementalSync, getSyncState, clearSyncState, triggerSync } = await import('../sync.js');

// ── Helpers ──

function mockSuccessResponse(body: unknown): Response {
	return {
		ok: true,
		status: 200,
		headers: new Headers(),
		json: () => Promise.resolve(body),
	} as unknown as Response;
}

function mockErrorResponse(status: number, body: unknown): Response {
	return {
		ok: false,
		status,
		headers: new Headers(),
		json: () => Promise.resolve(body),
	} as unknown as Response;
}

const SYNC_TABLE_COUNT = 8;

// ── Setup / Teardown ──

beforeEach(() => {
	mockStorage.clear();
	mockFetch.mockReset();
	mockIsSignedIn.mockReset();
	mockGetStoredToken.mockReset();
	mockDbQuery.mockReset();
	mockDbExecute.mockReset();
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});

	// Default: signed in with a token
	mockIsSignedIn.mockResolvedValue(true);
	mockGetStoredToken.mockResolvedValue('test-bearer-token');
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ── pushChanges ──

describe('pushChanges', () => {
	it('queries all 8 sync tables and POSTs payload', async () => {
		// Return rows only for exercises, empty for rest
		mockDbQuery.mockImplementation(async (stmt: string) => {
			if (stmt.includes('exercises')) {
				return [{ id: 'ex-1', name: 'Bench Press', updated_at: '2026-01-01T00:00:00Z' }];
			}
			return [];
		});

		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({ accepted: 1, conflicts: 0, server_now: '2026-03-13T12:00:00Z' }),
		);

		const result = await pushChanges(null);

		// Should have queried all 8 tables
		expect(mockDbQuery).toHaveBeenCalledTimes(SYNC_TABLE_COUNT);

		// Verify fetch was called with correct URL and auth
		expect(mockFetch).toHaveBeenCalledWith(
			'http://test-api.local/api/sync/push',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					Authorization: 'Bearer test-bearer-token',
				}),
			}),
		);

		// Verify payload has the exercises rows
		const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
		expect(callBody.tables.exercises).toHaveLength(1);
		expect(callBody.tables.exercises[0].id).toBe('ex-1');

		expect(result).toBe('2026-03-13T12:00:00Z');
	});

	it('uses updated_at filter for incremental push', async () => {
		mockDbQuery.mockResolvedValue([]);

		await pushChanges('2026-03-10T00:00:00Z');

		// All queries should include WHERE updated_at > ?
		for (const call of mockDbQuery.mock.calls) {
			expect(call[0]).toContain('WHERE updated_at > ?');
			expect(call[1]).toEqual(['2026-03-10T00:00:00Z']);
		}
	});

	it('skips push when no rows changed', async () => {
		mockDbQuery.mockResolvedValue([]);

		const result = await pushChanges('2026-03-10T00:00:00Z');

		expect(mockFetch).not.toHaveBeenCalled();
		expect(result).toBeNull();
	});

	it('returns null and logs on HTTP error', async () => {
		mockDbQuery.mockImplementation(async (stmt: string) => {
			if (stmt.includes('exercises')) return [{ id: 'ex-1', updated_at: '2026-01-01' }];
			return [];
		});

		mockFetch.mockResolvedValueOnce(
			mockErrorResponse(500, { message: 'Internal Server Error' }),
		);

		const result = await pushChanges(null);

		expect(result).toBeNull();
		expect(console.error).toHaveBeenCalled();
	});

	it('returns null and logs on network failure', async () => {
		mockDbQuery.mockImplementation(async (stmt: string) => {
			if (stmt.includes('exercises')) return [{ id: 'ex-1', updated_at: '2026-01-01' }];
			return [];
		});

		mockFetch.mockRejectedValueOnce(new Error('Network error'));

		const result = await pushChanges(null);

		expect(result).toBeNull();
		expect(console.error).toHaveBeenCalled();
	});

	it('returns null when no auth token', async () => {
		mockGetStoredToken.mockResolvedValueOnce(null);

		const result = await pushChanges(null);

		expect(result).toBeNull();
		expect(mockDbQuery).not.toHaveBeenCalled();
		expect(mockFetch).not.toHaveBeenCalled();
	});
});

// ── pullChanges ──

describe('pullChanges', () => {
	it('sends correct request and upserts pulled rows', async () => {
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({
				tables: {
					exercises: [
						{
							id: 'ex-1',
							name: 'Bench Press',
							description: null,
							muscle_group: 'chest',
							secondary_muscle_groups: null,
							equipment: 'barbell',
							is_custom: 0,
							is_compound: 1,
							created_at: '2026-01-01T00:00:00Z',
							updated_at: '2026-03-13T12:00:00Z',
							deleted_at: null,
						},
					],
				},
				server_now: '2026-03-13T12:00:01Z',
			}),
		);

		const result = await pullChanges('2026-03-10T00:00:00Z');

		// Verify pull request
		expect(mockFetch).toHaveBeenCalledWith(
			'http://test-api.local/api/sync/pull',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({
					Authorization: 'Bearer test-bearer-token',
				}),
			}),
		);

		const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
		expect(requestBody.last_pull_at).toBe('2026-03-10T00:00:00Z');

		// Verify upsert was called (INSERT OR REPLACE for exercises)
		expect(mockDbExecute).toHaveBeenCalledTimes(1);
		const [stmt] = mockDbExecute.mock.calls[0];
		expect(stmt).toContain('INSERT OR REPLACE INTO exercises');

		expect(result).toBe('2026-03-13T12:00:01Z');
	});

	it('sends empty string for full pull when lastPullAt is null', async () => {
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({ tables: {}, server_now: '2026-03-13T12:00:00Z' }),
		);

		await pullChanges(null);

		const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
		expect(requestBody.last_pull_at).toBe('');
	});

	it('handles body_weight_entries upsert — existing by id', async () => {
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({
				tables: {
					body_weight_entries: [
						{
							id: 'bw-1',
							date: '2026-03-13',
							weight_kg: 80.5,
							created_at: '2026-01-01T00:00:00Z',
							updated_at: '2026-03-13T12:00:00Z',
							deleted_at: null,
						},
					],
				},
				server_now: '2026-03-13T12:00:01Z',
			}),
		);

		// Existing row found by id
		mockDbQuery.mockImplementation(async (stmt: string) => {
			if (stmt.includes('WHERE id = ?')) {
				return [{ id: 'bw-1', updated_at: '2026-03-01T00:00:00Z' }];
			}
			return [];
		});

		await pullChanges(null);

		// Should UPDATE by id, not INSERT
		expect(mockDbExecute).toHaveBeenCalledTimes(1);
		const [stmt] = mockDbExecute.mock.calls[0];
		expect(stmt).toContain('UPDATE body_weight_entries SET');
		expect(stmt).toContain('WHERE id = ?');
	});

	it('handles body_weight_entries upsert — date conflict, pulled is newer', async () => {
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({
				tables: {
					body_weight_entries: [
						{
							id: 'bw-new',
							date: '2026-03-13',
							weight_kg: 81.0,
							created_at: '2026-03-13T00:00:00Z',
							updated_at: '2026-03-13T12:00:00Z',
							deleted_at: null,
						},
					],
				},
				server_now: '2026-03-13T12:00:01Z',
			}),
		);

		// No existing by id, but date conflict exists
		mockDbQuery.mockImplementation(async (stmt: string) => {
			if (stmt.includes('WHERE id = ?')) {
				return [];
			}
			if (stmt.includes('WHERE date = ?')) {
				return [{ id: 'bw-old', updated_at: '2026-03-12T00:00:00Z' }];
			}
			return [];
		});

		await pullChanges(null);

		// Should UPDATE the conflicting row
		expect(mockDbExecute).toHaveBeenCalledTimes(1);
		const [stmt, params] = mockDbExecute.mock.calls[0];
		expect(stmt).toContain('UPDATE body_weight_entries SET');
		// The WHERE id = ? at the end targets the conflicting row's id
		expect(params![params!.length - 1]).toBe('bw-old');
	});

	it('returns null and logs on HTTP error', async () => {
		mockFetch.mockResolvedValueOnce(
			mockErrorResponse(401, { message: 'Unauthorized' }),
		);

		const result = await pullChanges(null);

		expect(result).toBeNull();
		expect(console.error).toHaveBeenCalled();
	});

	it('returns null when no auth token', async () => {
		mockGetStoredToken.mockResolvedValueOnce(null);

		const result = await pullChanges(null);

		expect(result).toBeNull();
		expect(mockFetch).not.toHaveBeenCalled();
	});
});

// ── fullSync ──

describe('fullSync', () => {
	it('pushes all then pulls all, stores timestamps', async () => {
		// Push: some rows to push
		mockDbQuery.mockImplementation(async (stmt: string) => {
			if (stmt.includes('exercises') && !stmt.includes('body_weight')) {
				return [{ id: 'ex-1', updated_at: '2026-01-01' }];
			}
			return [];
		});

		// Push response
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({ accepted: 1, conflicts: 0, server_now: '2026-03-13T12:00:00Z' }),
		);

		// Pull response
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({ tables: {}, server_now: '2026-03-13T12:00:01Z' }),
		);

		await fullSync();

		// Both push and pull called
		expect(mockFetch).toHaveBeenCalledTimes(2);
		expect(mockFetch.mock.calls[0][0]).toContain('/api/sync/push');
		expect(mockFetch.mock.calls[1][0]).toContain('/api/sync/pull');

		// Timestamps stored
		expect(mockStorage.get('sync_last_push_at')).toBe('2026-03-13T12:00:00Z');
		expect(mockStorage.get('sync_last_pull_at')).toBe('2026-03-13T12:00:01Z');
	});

	it('does not store push timestamp on push failure', async () => {
		mockDbQuery.mockImplementation(async (stmt: string) => {
			if (stmt.includes('exercises') && !stmt.includes('body_weight')) {
				return [{ id: 'ex-1', updated_at: '2026-01-01' }];
			}
			return [];
		});

		// Push fails
		mockFetch.mockResolvedValueOnce(
			mockErrorResponse(500, { message: 'Error' }),
		);

		// Pull succeeds
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({ tables: {}, server_now: '2026-03-13T12:00:01Z' }),
		);

		await fullSync();

		expect(mockStorage.has('sync_last_push_at')).toBe(false);
		expect(mockStorage.get('sync_last_pull_at')).toBe('2026-03-13T12:00:01Z');
	});

	it('returns early when not signed in', async () => {
		mockIsSignedIn.mockResolvedValueOnce(false);

		await fullSync();

		expect(mockFetch).not.toHaveBeenCalled();
		expect(mockDbQuery).not.toHaveBeenCalled();
	});
});

// ── incrementalSync ──

describe('incrementalSync', () => {
	it('reads timestamps from Preferences and passes them to push/pull', async () => {
		mockStorage.set('sync_last_push_at', '2026-03-12T10:00:00Z');
		mockStorage.set('sync_last_pull_at', '2026-03-12T10:00:01Z');

		// No changes to push
		mockDbQuery.mockResolvedValue([]);

		// Pull response
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({ tables: {}, server_now: '2026-03-13T12:00:00Z' }),
		);

		await incrementalSync();

		// Push queries used the stored timestamp
		for (const call of mockDbQuery.mock.calls) {
			expect(call[0]).toContain('WHERE updated_at > ?');
			expect(call[1]).toEqual(['2026-03-12T10:00:00Z']);
		}

		// Pull request used the stored timestamp
		const pullBody = JSON.parse(mockFetch.mock.calls[0][1].body);
		expect(pullBody.last_pull_at).toBe('2026-03-12T10:00:01Z');
	});

	it('updates timestamps after successful sync', async () => {
		// Rows to push
		mockDbQuery.mockImplementation(async (stmt: string) => {
			if (stmt.includes('exercises') && !stmt.includes('body_weight')) {
				return [{ id: 'ex-1', updated_at: '2026-03-13' }];
			}
			return [];
		});

		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({ accepted: 1, conflicts: 0, server_now: '2026-03-13T14:00:00Z' }),
		);
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({ tables: {}, server_now: '2026-03-13T14:00:01Z' }),
		);

		await incrementalSync();

		expect(mockStorage.get('sync_last_push_at')).toBe('2026-03-13T14:00:00Z');
		expect(mockStorage.get('sync_last_pull_at')).toBe('2026-03-13T14:00:01Z');
	});

	it('returns early when not signed in', async () => {
		mockIsSignedIn.mockResolvedValueOnce(false);

		await incrementalSync();

		expect(mockFetch).not.toHaveBeenCalled();
		expect(mockDbQuery).not.toHaveBeenCalled();
	});
});

// ── getSyncState ──

describe('getSyncState', () => {
	it('returns defaults when no state exists', async () => {
		const state = await getSyncState();

		expect(state).toEqual({
			isSyncing: false,
			lastSyncAt: null,
			lastError: null,
			lastErrorAt: null,
		});
	});

	it('reads persisted timestamps and returns the later as lastSyncAt', async () => {
		mockStorage.set('sync_last_push_at', '2026-03-13T10:00:00Z');
		mockStorage.set('sync_last_pull_at', '2026-03-13T12:00:00Z');

		const state = await getSyncState();

		expect(state.lastSyncAt).toBe('2026-03-13T12:00:00Z');
		expect(state.isSyncing).toBe(false);
		expect(state.lastError).toBeNull();
	});

	it('returns push timestamp when only push exists', async () => {
		mockStorage.set('sync_last_push_at', '2026-03-13T10:00:00Z');

		const state = await getSyncState();

		expect(state.lastSyncAt).toBe('2026-03-13T10:00:00Z');
	});

	it('returns pull timestamp when only pull exists', async () => {
		mockStorage.set('sync_last_pull_at', '2026-03-13T11:00:00Z');

		const state = await getSyncState();

		expect(state.lastSyncAt).toBe('2026-03-13T11:00:00Z');
	});
});

// ── isSyncing flag ──

describe('isSyncing flag', () => {
	it('is true during sync and false after', async () => {
		// Capture isSyncing during sync via a side-effect in mockDbQuery
		let syncingDuringPush = false;

		mockDbQuery.mockImplementation(async (stmt: string) => {
			if (stmt.includes('exercises') && !stmt.includes('body_weight')) {
				const state = await getSyncState();
				syncingDuringPush = state.isSyncing;
				return [{ id: 'ex-1', updated_at: '2026-01-01' }];
			}
			return [];
		});

		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({ accepted: 1, conflicts: 0, server_now: '2026-03-13T12:00:00Z' }),
		);
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({ tables: {}, server_now: '2026-03-13T12:00:01Z' }),
		);

		await fullSync();

		expect(syncingDuringPush).toBe(true);

		const stateAfter = await getSyncState();
		expect(stateAfter.isSyncing).toBe(false);
	});
});

// ── lastError / lastErrorAt ──

describe('lastError tracking', () => {
	it('captures error on sync failure and clears on success', async () => {
		// Trigger an error: dbQuery throws during pushChanges
		mockDbQuery.mockRejectedValueOnce(new Error('DB exploded'));
		// Pull still needs a fetch mock (push fails before fetch)
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({ tables: {}, server_now: '2026-03-13T11:00:00Z' }),
		);

		await fullSync();

		const stateAfterError = await getSyncState();
		expect(stateAfterError.lastError).toBe('DB exploded');
		expect(stateAfterError.lastErrorAt).toBeTruthy();
		expect(stateAfterError.isSyncing).toBe(false);

		// Second: successful sync clears error
		mockDbQuery.mockResolvedValue([]);
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({ tables: {}, server_now: '2026-03-13T12:00:00Z' }),
		);

		await incrementalSync();

		const stateAfterSuccess = await getSyncState();
		expect(stateAfterSuccess.lastError).toBeNull();
		expect(stateAfterSuccess.lastErrorAt).toBeNull();
	});
});

// ── clearSyncState ──

describe('clearSyncState', () => {
	it('removes all sync state', async () => {
		// Set up some persisted state
		mockStorage.set('sync_last_push_at', '2026-03-13T10:00:00Z');
		mockStorage.set('sync_last_pull_at', '2026-03-13T12:00:00Z');

		// Trigger an error to set in-memory error state
		mockDbQuery.mockRejectedValueOnce(new Error('Some error'));
		// Pull still needs a fetch mock (push fails before fetch)
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({ tables: {}, server_now: '2026-03-13T12:00:01Z' }),
		);
		await fullSync();

		// Verify error state is set
		let state = await getSyncState();
		expect(state.lastError).toBeTruthy();
		expect(state.lastSyncAt).toBeTruthy();

		// Clear
		await clearSyncState();

		state = await getSyncState();
		expect(state).toEqual({
			isSyncing: false,
			lastSyncAt: null,
			lastError: null,
			lastErrorAt: null,
		});

		// Preferences keys are gone
		expect(mockStorage.has('sync_last_push_at')).toBe(false);
		expect(mockStorage.has('sync_last_pull_at')).toBe(false);
	});
});

// ── triggerSync ──

describe('triggerSync', () => {
	it('calls incrementalSync', async () => {
		mockDbQuery.mockResolvedValue([]);
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({ tables: {}, server_now: '2026-03-13T12:00:00Z' }),
		);

		await triggerSync();

		// Should have called pull (incremental sync path)
		expect(mockFetch).toHaveBeenCalledWith(
			'http://test-api.local/api/sync/pull',
			expect.objectContaining({ method: 'POST' }),
		);
	});
});

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

// ── Mock fetch ──

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ── Import module under test ──

const {
	signUp,
	signIn,
	signOut,
	getStoredToken,
	getAuthState,
	isSignedIn,
	signInWithSocial,
	getLinkedAccounts,
	linkSocialAccount,
	unlinkAccount,
} = await import('../auth-client.js');

// ── Test Helpers ──

function mockUser(overrides: Partial<{ id: string; email: string; name: string }> = {}) {
	return {
		id: overrides.id ?? 'user-123',
		email: overrides.email ?? 'test@example.com',
		name: overrides.name ?? 'Test User',
		emailVerified: false,
		image: null,
		createdAt: '2026-01-01T00:00:00Z',
		updatedAt: '2026-01-01T00:00:00Z',
	};
}

function mockSuccessResponse(body: unknown, headers?: Record<string, string>): Response {
	const headersObj = new Headers(headers);
	return {
		ok: true,
		status: 200,
		headers: headersObj,
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

// ── Setup / Teardown ──

beforeEach(() => {
	mockStorage.clear();
	mockFetch.mockReset();
	vi.spyOn(console, 'log').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

// ── signUp ──

describe('signUp', () => {
	it('stores token and user info on success (token from header)', async () => {
		const user = mockUser();
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse(
				{ token: null, user },
				{ 'set-auth-token': 'signed-token-abc' },
			),
		);

		const result = await signUp('test@example.com', 'password123', 'Test User');

		expect(result).toEqual({ success: true });
		expect(mockStorage.get('auth_token')).toBe('signed-token-abc');
		expect(mockStorage.get('auth_user_id')).toBe('user-123');
		expect(mockStorage.get('auth_user_email')).toBe('test@example.com');
		expect(mockStorage.get('auth_user_name')).toBe('Test User');
	});

	it('stores token from body when header is absent', async () => {
		const user = mockUser();
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({ token: 'body-token-xyz', user }),
		);

		const result = await signUp('test@example.com', 'password123', 'Test User');

		expect(result).toEqual({ success: true });
		expect(mockStorage.get('auth_token')).toBe('body-token-xyz');
	});

	it('prefers header token over body token', async () => {
		const user = mockUser();
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse(
				{ token: 'body-token', user },
				{ 'set-auth-token': 'header-token' },
			),
		);

		const result = await signUp('test@example.com', 'password123', 'Test User');

		expect(result).toEqual({ success: true });
		expect(mockStorage.get('auth_token')).toBe('header-token');
	});

	it('returns error when response has no token', async () => {
		const user = mockUser();
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({ token: null, user }),
		);

		const result = await signUp('test@example.com', 'password123', 'Test User');

		expect(result).toEqual({ success: false, error: 'No authentication token received' });
		expect(mockStorage.has('auth_token')).toBe(false);
	});

	it('returns error on HTTP failure', async () => {
		mockFetch.mockResolvedValueOnce(
			mockErrorResponse(422, { message: 'User already exists' }),
		);

		const result = await signUp('test@example.com', 'password123', 'Test User');

		expect(result).toEqual({ success: false, error: 'User already exists' });
		expect(mockStorage.has('auth_token')).toBe(false);
	});

	it('returns error on network failure', async () => {
		mockFetch.mockRejectedValueOnce(new Error('Network error'));

		const result = await signUp('test@example.com', 'password123', 'Test User');

		expect(result).toEqual({ success: false, error: 'Network error' });
		expect(mockStorage.has('auth_token')).toBe(false);
	});

	it('never throws', async () => {
		mockFetch.mockRejectedValueOnce('non-error throw');

		const result = await signUp('test@example.com', 'password123', 'Test User');

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('sends correct request body', async () => {
		const user = mockUser();
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse(
				{ token: 'tok', user },
				{ 'set-auth-token': 'tok' },
			),
		);

		await signUp('a@b.com', 'pass', 'Name');

		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/auth/sign-up/email'),
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: 'a@b.com', password: 'pass', name: 'Name' }),
			}),
		);
	});
});

// ── signIn ──

describe('signIn', () => {
	it('stores token and user info on success', async () => {
		const user = mockUser({ id: 'usr-456', email: 'login@test.com', name: 'Login User' });
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse(
				{ token: 'session-token', user, redirect: false },
				{ 'set-auth-token': 'signed-session-token' },
			),
		);

		const result = await signIn('login@test.com', 'mypassword');

		expect(result).toEqual({ success: true });
		expect(mockStorage.get('auth_token')).toBe('signed-session-token');
		expect(mockStorage.get('auth_user_id')).toBe('usr-456');
		expect(mockStorage.get('auth_user_email')).toBe('login@test.com');
		expect(mockStorage.get('auth_user_name')).toBe('Login User');
	});

	it('returns error on invalid credentials', async () => {
		mockFetch.mockResolvedValueOnce(
			mockErrorResponse(401, { message: 'Invalid email or password' }),
		);

		const result = await signIn('bad@test.com', 'wrong');

		expect(result).toEqual({ success: false, error: 'Invalid email or password' });
		expect(mockStorage.has('auth_token')).toBe(false);
	});

	it('returns error on network failure', async () => {
		mockFetch.mockRejectedValueOnce(new Error('Timeout'));

		const result = await signIn('test@test.com', 'pass');

		expect(result).toEqual({ success: false, error: 'Timeout' });
	});

	it('never throws', async () => {
		mockFetch.mockRejectedValueOnce(42);

		const result = await signIn('test@test.com', 'pass');

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});

	it('sends correct request body', async () => {
		const user = mockUser();
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse(
				{ token: 'tok', user, redirect: false },
				{ 'set-auth-token': 'tok' },
			),
		);

		await signIn('x@y.com', 'secret');

		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/auth/sign-in/email'),
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ email: 'x@y.com', password: 'secret' }),
			}),
		);
	});
});

// ── signOut ──

describe('signOut', () => {
	it('clears all stored auth data', async () => {
		// Pre-populate storage
		mockStorage.set('auth_token', 'some-token');
		mockStorage.set('auth_user_id', 'user-1');
		mockStorage.set('auth_user_email', 'test@test.com');
		mockStorage.set('auth_user_name', 'Test');

		const result = await signOut();

		expect(result).toEqual({ success: true });
		expect(mockStorage.has('auth_token')).toBe(false);
		expect(mockStorage.has('auth_user_id')).toBe(false);
		expect(mockStorage.has('auth_user_email')).toBe(false);
		expect(mockStorage.has('auth_user_name')).toBe(false);
	});

	it('succeeds even when nothing is stored', async () => {
		const result = await signOut();

		expect(result).toEqual({ success: true });
	});

	it('never throws', async () => {
		// signOut should always succeed since Preferences.remove on missing keys is a no-op
		const result = await signOut();

		expect(result.success).toBe(true);
	});
});

// ── getStoredToken ──

describe('getStoredToken', () => {
	it('returns token when stored', async () => {
		mockStorage.set('auth_token', 'my-bearer-token');

		const token = await getStoredToken();

		expect(token).toBe('my-bearer-token');
	});

	it('returns null when not stored', async () => {
		const token = await getStoredToken();

		expect(token).toBeNull();
	});
});

// ── getAuthState ──

describe('getAuthState', () => {
	it('returns signed-in state when credentials exist', async () => {
		mockStorage.set('auth_token', 'tok');
		mockStorage.set('auth_user_id', 'uid-1');
		mockStorage.set('auth_user_email', 'user@test.com');
		mockStorage.set('auth_user_name', 'User Name');

		const state = await getAuthState();

		expect(state).toEqual({
			isSignedIn: true,
			userId: 'uid-1',
			email: 'user@test.com',
			name: 'User Name',
		});
	});

	it('returns signed-out state when no credentials', async () => {
		const state = await getAuthState();

		expect(state).toEqual({
			isSignedIn: false,
			userId: null,
			email: null,
			name: null,
		});
	});

	it('returns signed-out state with safe defaults on error', async () => {
		// Overwrite the mock to throw
		const { Preferences } = await import('@capacitor/preferences');
		const originalGet = Preferences.get;
		vi.spyOn(Preferences, 'get').mockRejectedValueOnce(new Error('storage error'));

		const state = await getAuthState();

		expect(state).toEqual({
			isSignedIn: false,
			userId: null,
			email: null,
			name: null,
		});

		// Restore
		vi.mocked(Preferences.get).mockImplementation(originalGet);
	});
});

// ── isSignedIn ──

describe('isSignedIn', () => {
	it('returns true when token exists', async () => {
		mockStorage.set('auth_token', 'any-token');

		expect(await isSignedIn()).toBe(true);
	});

	it('returns false when no token', async () => {
		expect(await isSignedIn()).toBe(false);
	});

	it('returns false on error', async () => {
		const { Preferences } = await import('@capacitor/preferences');
		const originalGet = Preferences.get;
		vi.spyOn(Preferences, 'get').mockRejectedValueOnce(new Error('fail'));

		expect(await isSignedIn()).toBe(false);

		vi.mocked(Preferences.get).mockImplementation(originalGet);
	});
});

// ── Integration: signUp → getAuthState → signOut → getAuthState ──

describe('integration flow', () => {
	it('full sign-up → check state → sign-out → check state cycle', async () => {
		const user = mockUser({ id: 'u1', email: 'flow@test.com', name: 'Flow' });
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse(
				{ token: 'flow-token', user },
				{ 'set-auth-token': 'signed-flow-token' },
			),
		);

		// Sign up
		const signUpResult = await signUp('flow@test.com', 'pass', 'Flow');
		expect(signUpResult.success).toBe(true);

		// Check state
		const stateAfterSignUp = await getAuthState();
		expect(stateAfterSignUp.isSignedIn).toBe(true);
		expect(stateAfterSignUp.userId).toBe('u1');
		expect(stateAfterSignUp.email).toBe('flow@test.com');

		// Check token
		const token = await getStoredToken();
		expect(token).toBe('signed-flow-token');

		// Sign out
		const signOutResult = await signOut();
		expect(signOutResult.success).toBe(true);

		// Check state after sign out
		const stateAfterSignOut = await getAuthState();
		expect(stateAfterSignOut.isSignedIn).toBe(false);
		expect(stateAfterSignOut.userId).toBeNull();

		// Token gone
		const tokenAfter = await getStoredToken();
		expect(tokenAfter).toBeNull();
	});

	it('signIn overwrites previous credentials', async () => {
		// Set initial state
		mockStorage.set('auth_token', 'old-token');
		mockStorage.set('auth_user_id', 'old-user');
		mockStorage.set('auth_user_email', 'old@test.com');
		mockStorage.set('auth_user_name', 'Old');

		const user = mockUser({ id: 'new-user', email: 'new@test.com', name: 'New' });
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse(
				{ token: 'new-token', user, redirect: false },
				{ 'set-auth-token': 'new-signed-token' },
			),
		);

		const result = await signIn('new@test.com', 'pass');
		expect(result.success).toBe(true);

		const state = await getAuthState();
		expect(state.userId).toBe('new-user');
		expect(state.email).toBe('new@test.com');
		expect(state.name).toBe('New');

		const token = await getStoredToken();
		expect(token).toBe('new-signed-token');
	});
});

// ── signInWithSocial ──

describe('signInWithSocial', () => {
	it('stores token and user on success with header token and social response shape', async () => {
		const user = mockUser({ id: 'social-1', email: 'social@test.com', name: 'Social User' });
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse(
				{ data: { user, session: { token: 'session-tok' } }, error: null },
				{ 'set-auth-token': 'header-social-token' },
			),
		);

		const result = await signInWithSocial('google', 'id-token-abc', 'access-token-xyz');

		expect(result).toEqual({ success: true });
		expect(mockStorage.get('auth_token')).toBe('header-social-token');
		expect(mockStorage.get('auth_user_id')).toBe('social-1');
		expect(mockStorage.get('auth_user_email')).toBe('social@test.com');
		expect(mockStorage.get('auth_user_name')).toBe('Social User');
	});

	it('falls back to body token from data.session.token when header absent', async () => {
		const user = mockUser({ id: 'social-2', email: 'fb@test.com', name: 'FB User' });
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse(
				{ data: { user, session: { token: 'body-session-token' } }, error: null },
			),
		);

		const result = await signInWithSocial('google', 'id-token-def');

		expect(result).toEqual({ success: true });
		expect(mockStorage.get('auth_token')).toBe('body-session-token');
		expect(mockStorage.get('auth_user_id')).toBe('social-2');
	});

	it('falls back to body.token when data.session absent', async () => {
		const user = mockUser({ id: 'social-3' });
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse(
				{ user, token: 'legacy-body-token' },
			),
		);

		const result = await signInWithSocial('google', 'id-token-ghi');

		expect(result).toEqual({ success: true });
		expect(mockStorage.get('auth_token')).toBe('legacy-body-token');
	});

	it('returns error on HTTP failure', async () => {
		mockFetch.mockResolvedValueOnce(
			mockErrorResponse(403, { message: 'Provider not configured' }),
		);

		const result = await signInWithSocial('google', 'bad-token');

		expect(result).toEqual({ success: false, error: 'Provider not configured' });
		expect(mockStorage.has('auth_token')).toBe(false);
	});

	it('returns error on network failure', async () => {
		mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

		const result = await signInWithSocial('google', 'any-token');

		expect(result).toEqual({ success: false, error: 'Connection refused' });
		expect(mockStorage.has('auth_token')).toBe(false);
	});

	it('returns error when no token in response', async () => {
		const user = mockUser();
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse(
				{ data: { user, session: {} }, error: null },
			),
		);

		const result = await signInWithSocial('google', 'id-token-no-tok');

		expect(result).toEqual({ success: false, error: 'No authentication token received' });
		expect(mockStorage.has('auth_token')).toBe(false);
	});

	it('sends correct request body shape with provider and idToken object', async () => {
		const user = mockUser();
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse(
				{ data: { user, session: { token: 'tok' } }, error: null },
				{ 'set-auth-token': 'tok' },
			),
		);

		await signInWithSocial('google', 'my-id-token', 'my-access-token', 'my-nonce');

		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/auth/sign-in/social'),
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					provider: 'google',
					idToken: { token: 'my-id-token', accessToken: 'my-access-token', nonce: 'my-nonce' },
				}),
			}),
		);

		// Verify the URL does NOT contain /social/token (the old bug)
		const calledUrl = mockFetch.mock.calls[0][0] as string;
		expect(calledUrl).not.toContain('/social/token');
	});

	it('includes idToken.user when user param is provided', async () => {
		const user = mockUser({ id: 'apple-1', email: 'apple@test.com', name: 'Apple User' });
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse(
				{ data: { user, session: { token: 'apple-tok' } }, error: null },
				{ 'set-auth-token': 'apple-tok' },
			),
		);

		await signInWithSocial('apple', 'apple-id-token', 'apple-access-token', 'nonce-123', {
			name: { firstName: 'Jane', lastName: 'Doe' },
			email: 'jane@apple.com',
		});

		const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
		expect(body.provider).toBe('apple');
		expect(body.idToken.token).toBe('apple-id-token');
		expect(body.idToken.accessToken).toBe('apple-access-token');
		expect(body.idToken.nonce).toBe('nonce-123');
		expect(body.idToken.user).toEqual({
			name: { firstName: 'Jane', lastName: 'Doe' },
			email: 'jane@apple.com',
		});

		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/auth/sign-in/social'),
			expect.anything(),
		);
	});

	it('omits idToken.user when user param is not provided', async () => {
		const user = mockUser();
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse(
				{ data: { user, session: { token: 'tok' } }, error: null },
				{ 'set-auth-token': 'tok' },
			),
		);

		await signInWithSocial('google', 'id-token-only');

		const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
		expect(body.idToken.user).toBeUndefined();
	});

	it('never throws', async () => {
		mockFetch.mockRejectedValueOnce(42);

		const result = await signInWithSocial('google', 'any');

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});

// ── getLinkedAccounts ──

describe('getLinkedAccounts', () => {
	it('returns accounts list on success', async () => {
		mockStorage.set('auth_token', 'test-token');
		const accounts = [
			{ id: 'acc-1', providerId: 'credential', accountId: 'user@test.com' },
			{ id: 'acc-2', providerId: 'google', accountId: 'google-123' },
		];
		mockFetch.mockResolvedValueOnce(mockSuccessResponse(accounts));

		const result = await getLinkedAccounts();

		expect(result).toEqual({ success: true, accounts });
	});

	it('sends GET with Authorization Bearer header', async () => {
		mockStorage.set('auth_token', 'bearer-token-xyz');
		mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));

		await getLinkedAccounts();

		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/auth/list-accounts'),
			expect.objectContaining({
				method: 'GET',
				headers: { Authorization: 'Bearer bearer-token-xyz' },
			}),
		);
	});

	it('returns empty array when no token stored', async () => {
		const result = await getLinkedAccounts();

		expect(result).toEqual({ success: true, accounts: [] });
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('returns empty accounts array on success with empty response', async () => {
		mockStorage.set('auth_token', 'test-token');
		mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));

		const result = await getLinkedAccounts();

		expect(result).toEqual({ success: true, accounts: [] });
	});

	it('returns error on HTTP failure', async () => {
		mockStorage.set('auth_token', 'test-token');
		mockFetch.mockResolvedValueOnce(
			mockErrorResponse(401, { message: 'Unauthorized' }),
		);

		const result = await getLinkedAccounts();

		expect(result).toEqual({ success: false, accounts: [], error: 'Unauthorized' });
	});

	it('returns error on network failure', async () => {
		mockStorage.set('auth_token', 'test-token');
		mockFetch.mockRejectedValueOnce(new Error('Network error'));

		const result = await getLinkedAccounts();

		expect(result).toEqual({ success: false, accounts: [], error: 'Network error' });
	});

	it('never throws', async () => {
		mockStorage.set('auth_token', 'test-token');
		mockFetch.mockRejectedValueOnce('non-error throw');

		const result = await getLinkedAccounts();

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});

// ── linkSocialAccount ──

describe('linkSocialAccount', () => {
	it('returns success on successful link', async () => {
		mockStorage.set('auth_token', 'test-token');
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({ status: true }),
		);

		const result = await linkSocialAccount('google', 'id-token-abc', 'access-token-xyz', 'nonce-123');

		expect(result).toEqual({ success: true });
	});

	it('sends correct request body shape with idToken object', async () => {
		mockStorage.set('auth_token', 'test-token');
		mockFetch.mockResolvedValueOnce(mockSuccessResponse({ status: true }));

		await linkSocialAccount('google', 'my-id-token', 'my-access-token', 'my-nonce');

		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/auth/link-social'),
			expect.objectContaining({
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer test-token',
				},
				body: JSON.stringify({
					provider: 'google',
					idToken: { token: 'my-id-token', accessToken: 'my-access-token', nonce: 'my-nonce' },
				}),
			}),
		);
	});

	it('returns error when not signed in', async () => {
		const result = await linkSocialAccount('google', 'id-token');

		expect(result).toEqual({ success: false, error: 'Not signed in' });
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('returns error on HTTP failure', async () => {
		mockStorage.set('auth_token', 'test-token');
		mockFetch.mockResolvedValueOnce(
			mockErrorResponse(400, { message: 'Email mismatch' }),
		);

		const result = await linkSocialAccount('google', 'bad-token');

		expect(result).toEqual({ success: false, error: 'Email mismatch' });
	});

	it('returns error on network failure', async () => {
		mockStorage.set('auth_token', 'test-token');
		mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

		const result = await linkSocialAccount('google', 'any-token');

		expect(result).toEqual({ success: false, error: 'Connection refused' });
	});

	it('never throws', async () => {
		mockStorage.set('auth_token', 'test-token');
		mockFetch.mockRejectedValueOnce(42);

		const result = await linkSocialAccount('google', 'any');

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});

// ── unlinkAccount ──

describe('unlinkAccount', () => {
	it('returns success on successful unlink', async () => {
		mockStorage.set('auth_token', 'test-token');
		mockFetch.mockResolvedValueOnce(
			mockSuccessResponse({ status: true }),
		);

		const result = await unlinkAccount('google');

		expect(result).toEqual({ success: true });
	});

	it('sends providerId in request body', async () => {
		mockStorage.set('auth_token', 'test-token');
		mockFetch.mockResolvedValueOnce(mockSuccessResponse({ status: true }));

		await unlinkAccount('apple');

		expect(mockFetch).toHaveBeenCalledWith(
			expect.stringContaining('/api/auth/unlink-account'),
			expect.objectContaining({
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer test-token',
				},
				body: JSON.stringify({ providerId: 'apple' }),
			}),
		);
	});

	it('surfaces user-friendly message for last account error', async () => {
		mockStorage.set('auth_token', 'test-token');
		mockFetch.mockResolvedValueOnce(
			mockErrorResponse(400, { message: 'FAILED_TO_UNLINK_LAST_ACCOUNT', code: 'FAILED_TO_UNLINK_LAST_ACCOUNT' }),
		);

		const result = await unlinkAccount('credential');

		expect(result).toEqual({ success: false, error: 'Cannot disconnect your only login method' });
	});

	it('returns error when not signed in', async () => {
		const result = await unlinkAccount('google');

		expect(result).toEqual({ success: false, error: 'Not signed in' });
		expect(mockFetch).not.toHaveBeenCalled();
	});

	it('returns error on HTTP failure', async () => {
		mockStorage.set('auth_token', 'test-token');
		mockFetch.mockResolvedValueOnce(
			mockErrorResponse(403, { message: 'SESSION_NOT_FRESH' }),
		);

		const result = await unlinkAccount('google');

		expect(result).toEqual({ success: false, error: 'SESSION_NOT_FRESH' });
	});

	it('returns error on network failure', async () => {
		mockStorage.set('auth_token', 'test-token');
		mockFetch.mockRejectedValueOnce(new Error('Timeout'));

		const result = await unlinkAccount('google');

		expect(result).toEqual({ success: false, error: 'Timeout' });
	});

	it('never throws', async () => {
		mockStorage.set('auth_token', 'test-token');
		mockFetch.mockRejectedValueOnce('non-error throw');

		const result = await unlinkAccount('google');

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});

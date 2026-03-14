/**
 * Auth Client — mobile auth service wrapping Better Auth server API.
 *
 * Handles sign-up, sign-in, sign-out flows against the SvelteKit web API.
 * Persists Bearer tokens and user info in @capacitor/preferences for
 * offline access and cross-restart persistence.
 *
 * Every exported function:
 * - Returns a typed result (never throws) — matching D073 catch-and-return
 * - Persists state via @capacitor/preferences — matching D103
 * - Logs with `[Auth]` prefix — matching [Premium] / [PurchasePlugin] patterns
 *
 * @module
 */

import { PUBLIC_API_BASE_URL } from '$env/static/public';
import { Preferences } from '@capacitor/preferences';

// ── Configuration ──

/**
 * Base URL of the SvelteKit web API that hosts Better Auth.
 * In local development, this points to the local dev server.
 * For production, configure per-environment.
 */
export const API_BASE_URL = PUBLIC_API_BASE_URL;

// ── Preferences Keys ──

const TOKEN_KEY = 'auth_token';
const USER_ID_KEY = 'auth_user_id';
const USER_EMAIL_KEY = 'auth_user_email';
const USER_NAME_KEY = 'auth_user_name';

// ── Types ──

export interface AuthResult {
	success: boolean;
	error?: string;
}

export interface LinkedAccount {
	id: string;
	providerId: string;
	accountId: string;
}

export interface LinkedAccountsResult {
	success: boolean;
	accounts: LinkedAccount[];
	error?: string;
}

export interface AuthState {
	isSignedIn: boolean;
	userId: string | null;
	email: string | null;
	name: string | null;
}

interface BetterAuthUser {
	id: string;
	email: string;
	name: string;
	emailVerified: boolean;
	image?: string | null;
	createdAt: string;
	updatedAt: string;
}

interface SignInResponse {
	token: string;
	user: BetterAuthUser;
	redirect: boolean;
	url?: string;
}

interface SignUpResponse {
	token: string | null;
	user: BetterAuthUser;
}

interface BetterAuthError {
	message?: string;
	code?: string;
	status?: number;
}

// ── Internal Helpers ──

/**
 * Store auth credentials in Preferences.
 * The token is the signed session token used as Bearer auth.
 */
async function storeCredentials(token: string, user: BetterAuthUser): Promise<void> {
	await Promise.all([
		Preferences.set({ key: TOKEN_KEY, value: token }),
		Preferences.set({ key: USER_ID_KEY, value: user.id }),
		Preferences.set({ key: USER_EMAIL_KEY, value: user.email }),
		Preferences.set({ key: USER_NAME_KEY, value: user.name })
	]);
}

/**
 * Clear all auth credentials from Preferences.
 */
async function clearCredentials(): Promise<void> {
	await Promise.all([
		Preferences.remove({ key: TOKEN_KEY }),
		Preferences.remove({ key: USER_ID_KEY }),
		Preferences.remove({ key: USER_EMAIL_KEY }),
		Preferences.remove({ key: USER_NAME_KEY })
	]);
}

/**
 * Extract the Bearer token from the response.
 *
 * The Better Auth Bearer plugin sets the signed session token in the
 * `set-auth-token` response header. Falls back to the `token` field
 * in the response body if the header is not present.
 */
function extractToken(response: Response, body: SignInResponse | SignUpResponse): string | null {
	// Prefer the set-auth-token header (Bearer plugin output)
	const headerToken = response.headers.get('set-auth-token');
	if (headerToken) {
		return headerToken;
	}

	// Fall back to body token
	if (body.token) {
		return body.token;
	}

	return null;
}

/**
 * Parse an error from a Better Auth error response body.
 */
function parseErrorMessage(body: unknown): string {
	if (body && typeof body === 'object') {
		const err = body as BetterAuthError;
		return err.message || err.code || 'Unknown error';
	}
	return 'Unknown error';
}

// ── Public API ──

/**
 * Sign up a new user with email and password.
 *
 * Calls Better Auth's `/api/auth/sign-up/email` endpoint.
 * On success, stores the Bearer token and user info in Preferences.
 *
 * @returns `{success: true}` on success, `{success: false, error: string}` on failure.
 */
export async function signUp(email: string, password: string, name: string): Promise<AuthResult> {
	try {
		console.log(`[Auth] signUp: attempting for ${email}`);

		const response = await fetch(`${API_BASE_URL}/api/auth/sign-up/email`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, name })
		});

		if (!response.ok) {
			const errorBody = await response.json().catch(() => ({}));
			const message = parseErrorMessage(errorBody);
			console.error(`[Auth] signUp: failed (${response.status}) — ${message}`);
			return { success: false, error: message };
		}

		const body: SignUpResponse = await response.json();
		const token = extractToken(response, body);

		if (!token) {
			console.error('[Auth] signUp: no token in response');
			return { success: false, error: 'No authentication token received' };
		}

		await storeCredentials(token, body.user);
		console.log(`[Auth] signUp: success for user ${body.user.id}`);
		return { success: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Sign-up failed';
		console.error('[Auth] signUp: unexpected error', error);
		return { success: false, error: message };
	}
}

/**
 * Sign in an existing user with email and password.
 *
 * Calls Better Auth's `/api/auth/sign-in/email` endpoint.
 * On success, stores the Bearer token and user info in Preferences.
 *
 * @returns `{success: true}` on success, `{success: false, error: string}` on failure.
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
	try {
		console.log(`[Auth] signIn: attempting for ${email}`);

		const response = await fetch(`${API_BASE_URL}/api/auth/sign-in/email`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password })
		});

		if (!response.ok) {
			const errorBody = await response.json().catch(() => ({}));
			const message = parseErrorMessage(errorBody);
			console.error(`[Auth] signIn: failed (${response.status}) — ${message}`);
			return { success: false, error: message };
		}

		const body: SignInResponse = await response.json();
		const token = extractToken(response, body);

		if (!token) {
			console.error('[Auth] signIn: no token in response');
			return { success: false, error: 'No authentication token received' };
		}

		await storeCredentials(token, body.user);
		console.log(`[Auth] signIn: success for user ${body.user.id}`);
		return { success: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Sign-in failed';
		console.error('[Auth] signIn: unexpected error', error);
		return { success: false, error: message };
	}
}

/**
 * Sign out the current user.
 *
 * Clears stored token and user info from Preferences.
 * Does not call the server sign-out endpoint — the token simply becomes
 * unused and will expire server-side naturally.
 *
 * @returns `{success: true}` on success, `{success: false, error: string}` on failure.
 */
export async function signOut(): Promise<AuthResult> {
	try {
		console.log('[Auth] signOut: clearing credentials');
		await clearCredentials();
		console.log('[Auth] signOut: success');
		return { success: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Sign-out failed';
		console.error('[Auth] signOut: unexpected error', error);
		return { success: false, error: message };
	}
}

/**
 * Get the stored Bearer token for use in API requests.
 *
 * @returns The token string, or `null` if not signed in.
 */
export async function getStoredToken(): Promise<string | null> {
	try {
		const { value } = await Preferences.get({ key: TOKEN_KEY });
		return value;
	} catch (error) {
		console.error('[Auth] getStoredToken: failed to read', error);
		return null;
	}
}

/**
 * Get the current auth state from stored Preferences.
 *
 * @returns Typed auth state with sign-in status and user info.
 */
export async function getAuthState(): Promise<AuthState> {
	try {
		const [tokenResult, userIdResult, emailResult, nameResult] = await Promise.all([
			Preferences.get({ key: TOKEN_KEY }),
			Preferences.get({ key: USER_ID_KEY }),
			Preferences.get({ key: USER_EMAIL_KEY }),
			Preferences.get({ key: USER_NAME_KEY })
		]);

		const hasToken = tokenResult.value !== null;

		return {
			isSignedIn: hasToken,
			userId: userIdResult.value,
			email: emailResult.value,
			name: nameResult.value
		};
	} catch (error) {
		console.error('[Auth] getAuthState: failed to read', error);
		return {
			isSignedIn: false,
			userId: null,
			email: null,
			name: null
		};
	}
}

/**
 * Sign in with a social provider (Google, Apple) via native idToken handoff.
 *
 * Calls Better Auth's `/api/auth/sign-in/social` endpoint with the
 * idToken obtained from the native SocialLogin plugin. On success, stores
 * the Bearer token and user info in Preferences.
 *
 * The social endpoint returns `{ data: { user, session }, error }` which
 * differs from the email endpoint's `{ token, user }`. This function
 * handles both shapes for token and user extraction.
 *
 * @param provider - Social provider name ('google' or 'apple')
 * @param idToken - The idToken from the native sign-in
 * @param accessToken - Optional access token from the native sign-in
 * @param nonce - Optional nonce (required for Apple Sign-In)
 * @param user - Optional user profile data (Apple sends name/email only on first auth)
 * @returns `{success: true}` on success, `{success: false, error: string}` on failure.
 */
export async function signInWithSocial(
	provider: string,
	idToken: string,
	accessToken?: string,
	nonce?: string,
	user?: { name?: { firstName?: string; lastName?: string }; email?: string }
): Promise<AuthResult> {
	try {
		console.log(`[Auth] signInWithSocial: attempting with ${provider}`);

		const idTokenPayload: Record<string, unknown> = { token: idToken, accessToken, nonce };
		if (user) {
			idTokenPayload.user = user;
		}

		const response = await fetch(`${API_BASE_URL}/api/auth/sign-in/social`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				provider,
				idToken: idTokenPayload
			})
		});

		if (!response.ok) {
			const errorBody = await response.json().catch(() => ({}));
			const message = parseErrorMessage(errorBody);
			console.error(`[Auth] signInWithSocial: failed (${response.status}) — ${message}`);
			return { success: false, error: message };
		}

		const body = await response.json();

		// Extract token: prefer set-auth-token header, fall back to body paths
		const headerToken = extractToken(response, body);
		const token = headerToken || body.data?.session?.token || body.token || null;

		if (!token) {
			console.error('[Auth] signInWithSocial: no token in response');
			return { success: false, error: 'No authentication token received' };
		}

		// Extract user: social response wraps in data.user, email response uses body.user
		const responseUser: BetterAuthUser | undefined = body.data?.user || body.user;

		if (!responseUser) {
			console.error('[Auth] signInWithSocial: no user in response');
			return { success: false, error: 'No user data received' };
		}

		await storeCredentials(token, responseUser);
		console.log(`[Auth] signInWithSocial: success for user ${responseUser.id}`);
		return { success: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Social sign-in failed';
		console.error('[Auth] signInWithSocial: unexpected error', error);
		return { success: false, error: message };
	}
}

/**
 * Convenience check for whether the user is currently signed in.
 *
 * @returns `true` if a token is stored, `false` otherwise.
 */
export async function isSignedIn(): Promise<boolean> {
	try {
		const { value } = await Preferences.get({ key: TOKEN_KEY });
		return value !== null;
	} catch (error) {
		console.error('[Auth] isSignedIn: failed to read', error);
		return false;
	}
}

/**
 * Get the list of linked accounts for the current user.
 *
 * Calls Better Auth's `/api/auth/list-accounts` endpoint with Bearer auth.
 * Returns an empty accounts array when not signed in (no token stored).
 *
 * @returns `{success: true, accounts: [...]}` on success, `{success: false, accounts: [], error: string}` on failure.
 */
export async function getLinkedAccounts(): Promise<LinkedAccountsResult> {
	try {
		console.log('[Auth] getLinkedAccounts: attempting');

		const token = await getStoredToken();
		if (!token) {
			console.log('[Auth] getLinkedAccounts: no token stored, returning empty');
			return { success: true, accounts: [] };
		}

		const response = await fetch(`${API_BASE_URL}/api/auth/list-accounts`, {
			method: 'GET',
			headers: { Authorization: `Bearer ${token}` }
		});

		if (!response.ok) {
			const errorBody = await response.json().catch(() => ({}));
			const message = parseErrorMessage(errorBody);
			console.error(`[Auth] getLinkedAccounts: failed (${response.status}) — ${message}`);
			return { success: false, accounts: [], error: message };
		}

		const body = await response.json();
		const accounts: LinkedAccount[] = Array.isArray(body) ? body : [];
		console.log(`[Auth] getLinkedAccounts: success, ${accounts.length} account(s)`);
		return { success: true, accounts };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to load accounts';
		console.error('[Auth] getLinkedAccounts: unexpected error', error);
		return { success: false, accounts: [], error: message };
	}
}

/**
 * Link a social provider to the current user's account.
 *
 * Calls Better Auth's `/api/auth/link-social` endpoint with Bearer auth
 * and the idToken obtained from the native social login plugin.
 *
 * @param provider - Social provider name ('google' or 'apple')
 * @param idToken - The idToken from the native sign-in
 * @param accessToken - Optional access token from the native sign-in
 * @param nonce - Optional nonce (required for Apple Sign-In)
 * @returns `{success: true}` on success, `{success: false, error: string}` on failure.
 */
export async function linkSocialAccount(
	provider: string,
	idToken: string,
	accessToken?: string,
	nonce?: string
): Promise<AuthResult> {
	try {
		console.log(`[Auth] linkSocialAccount: attempting with ${provider}`);

		const token = await getStoredToken();
		if (!token) {
			console.error('[Auth] linkSocialAccount: no token stored');
			return { success: false, error: 'Not signed in' };
		}

		const response = await fetch(`${API_BASE_URL}/api/auth/link-social`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				provider,
				idToken: { token: idToken, accessToken, nonce }
			})
		});

		if (!response.ok) {
			const errorBody = await response.json().catch(() => ({}));
			const message = parseErrorMessage(errorBody);
			console.error(`[Auth] linkSocialAccount: failed (${response.status}) — ${message}`);
			return { success: false, error: message };
		}

		console.log(`[Auth] linkSocialAccount: success for ${provider}`);
		return { success: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to link account';
		console.error('[Auth] linkSocialAccount: unexpected error', error);
		return { success: false, error: message };
	}
}

/**
 * Unlink a provider from the current user's account.
 *
 * Calls Better Auth's `/api/auth/unlink-account` endpoint with Bearer auth.
 * Returns a user-friendly error if the user tries to unlink their last account.
 *
 * @param providerId - The provider to unlink ('credential', 'google', 'apple')
 * @returns `{success: true}` on success, `{success: false, error: string}` on failure.
 */
export async function unlinkAccount(providerId: string): Promise<AuthResult> {
	try {
		console.log(`[Auth] unlinkAccount: attempting for ${providerId}`);

		const token = await getStoredToken();
		if (!token) {
			console.error('[Auth] unlinkAccount: no token stored');
			return { success: false, error: 'Not signed in' };
		}

		const response = await fetch(`${API_BASE_URL}/api/auth/unlink-account`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({ providerId })
		});

		if (!response.ok) {
			const errorBody = await response.json().catch(() => ({}));
			const rawMessage = parseErrorMessage(errorBody);

			// Surface user-friendly message for last-account error
			const message =
				rawMessage === 'FAILED_TO_UNLINK_LAST_ACCOUNT' ||
				(typeof (errorBody as Record<string, unknown>).code === 'string' &&
					(errorBody as Record<string, unknown>).code === 'FAILED_TO_UNLINK_LAST_ACCOUNT')
					? 'Cannot disconnect your only login method'
					: rawMessage;

			console.error(`[Auth] unlinkAccount: failed (${response.status}) — ${message}`);
			return { success: false, error: message };
		}

		console.log(`[Auth] unlinkAccount: success for ${providerId}`);
		return { success: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to unlink account';
		console.error('[Auth] unlinkAccount: unexpected error', error);
		return { success: false, error: message };
	}
}

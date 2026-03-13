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

import { Preferences } from '@capacitor/preferences';

// ── Configuration ──

/**
 * Base URL of the SvelteKit web API that hosts Better Auth.
 * In local development, this points to the local dev server.
 * For production, configure per-environment.
 */
const API_BASE_URL = 'http://localhost:5173';

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
		Preferences.set({ key: USER_NAME_KEY, value: user.name }),
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
		Preferences.remove({ key: USER_NAME_KEY }),
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
export async function signUp(
	email: string,
	password: string,
	name: string,
): Promise<AuthResult> {
	try {
		console.log(`[Auth] signUp: attempting for ${email}`);

		const response = await fetch(`${API_BASE_URL}/api/auth/sign-up/email`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, name }),
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
export async function signIn(
	email: string,
	password: string,
): Promise<AuthResult> {
	try {
		console.log(`[Auth] signIn: attempting for ${email}`);

		const response = await fetch(`${API_BASE_URL}/api/auth/sign-in/email`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password }),
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
			Preferences.get({ key: USER_NAME_KEY }),
		]);

		const hasToken = tokenResult.value !== null;

		return {
			isSignedIn: hasToken,
			userId: userIdResult.value,
			email: emailResult.value,
			name: nameResult.value,
		};
	} catch (error) {
		console.error('[Auth] getAuthState: failed to read', error);
		return {
			isSignedIn: false,
			userId: null,
			email: null,
			name: null,
		};
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

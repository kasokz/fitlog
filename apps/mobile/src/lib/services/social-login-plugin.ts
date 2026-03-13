/**
 * Social Login Plugin — typed wrapper around @capgo/capacitor-social-login.
 *
 * Guards all calls with native-platform checks, returns safe defaults on web,
 * and logs diagnostics with `[SocialLogin]` prefix. This is the single
 * integration point for native Google and Apple sign-in consumed by
 * the auth-client service.
 *
 * Every exported function:
 * - Checks `Capacitor.isNativePlatform()` before calling the native plugin
 * - Returns a typed safe default on web (null / void)
 * - Wraps native calls in try/catch — never throws
 * - Logs outcome with `[SocialLogin]` prefix for observability
 *
 * @module
 */

import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import type { GoogleLoginResponseOnline, AppleProviderResponse } from '@capgo/capacitor-social-login';

// ── Types ──

export interface SocialLoginResult {
	idToken: string;
	accessToken?: string;
}

export interface AppleProfile {
	email: string | null;
	givenName: string | null;
	familyName: string | null;
}

export interface AppleSocialLoginResult {
	idToken: string;
	accessToken?: string;
	nonce: string;
	profile?: AppleProfile;
}

// ── Helpers ──

/** Returns true when running on a native platform (iOS/Android). */
function isNative(): boolean {
	return Capacitor.isNativePlatform();
}

// ── Wrapper Functions ──

/**
 * Initialize the SocialLogin plugin with Google and Apple providers.
 *
 * Must be called once at app startup (e.g. in root layout mount effect).
 * No-op on web. Fire-and-forget — catches and logs errors.
 *
 * @param googleWebClientId - Google OAuth web client ID from Google Cloud Console.
 */
export async function initializeSocialLogin(googleWebClientId: string): Promise<void> {
	if (!isNative()) {
		console.debug('[SocialLogin] initialize: skipped (web)');
		return;
	}

	try {
		await SocialLogin.initialize({
			google: {
				webClientId: googleWebClientId,
				mode: 'online',
			},
			apple: {
				clientId: 'com.fitlog.app',
			},
		});
		console.log('[SocialLogin] initialize: success');
	} catch (error) {
		console.error('[SocialLogin] initialize: failed', error);
	}
}

/**
 * Sign in with Google via native Credential Manager / Google Sign-In.
 *
 * Returns the idToken and accessToken needed for the Better Auth
 * social sign-in endpoint. Returns `null` on user cancel, web, or error.
 * Never throws.
 */
export async function loginWithGoogle(): Promise<SocialLoginResult | null> {
	if (!isNative()) {
		console.debug('[SocialLogin] loginWithGoogle: skipped (web)');
		return null;
	}

	try {
		console.log('[SocialLogin] loginWithGoogle: attempting');

		const response = await SocialLogin.login({
			provider: 'google',
			options: {},
		});

		const result = response.result as GoogleLoginResponseOnline;

		if (result.responseType !== 'online') {
			console.error('[SocialLogin] loginWithGoogle: unexpected response type', result.responseType);
			return null;
		}

		if (!result.idToken) {
			console.error('[SocialLogin] loginWithGoogle: no idToken in response');
			return null;
		}

		console.log('[SocialLogin] loginWithGoogle: success');
		return {
			idToken: result.idToken,
			accessToken: result.accessToken?.token,
		};
	} catch (error) {
		// User cancel surfaces as an error from the native plugin
		const message = error instanceof Error ? error.message : String(error);
		if (message.toLowerCase().includes('cancel')) {
			console.log('[SocialLogin] loginWithGoogle: cancelled by user');
		} else {
			console.error('[SocialLogin] loginWithGoogle: failed', error);
		}
		return null;
	}
}

/**
 * Sign in with Apple via native Apple Sign-In sheet.
 *
 * Returns the idToken, accessToken, and nonce needed for the Better Auth
 * social sign-in endpoint. Returns `null` on user cancel, web, or error.
 * Never throws.
 *
 * @param nonce - Client-generated nonce that must also be passed to the Better Auth endpoint.
 */
export async function loginWithApple(nonce: string): Promise<AppleSocialLoginResult | null> {
	if (!isNative()) {
		console.debug('[SocialLogin] loginWithApple: skipped (web)');
		return null;
	}

	try {
		console.log('[SocialLogin] loginWithApple: attempting');

		const response = await SocialLogin.login({
			provider: 'apple',
			options: { nonce },
		});

		const result = response.result as AppleProviderResponse;

		if (!result.idToken) {
			console.error('[SocialLogin] loginWithApple: no idToken in response');
			return null;
		}

		// Extract profile if available (Apple only sends it on first authorization)
		const profile: AppleProfile | undefined = result.profile
			? {
					email: (result.profile as Record<string, string | null>).email ?? null,
					givenName: (result.profile as Record<string, string | null>).givenName ?? null,
					familyName: (result.profile as Record<string, string | null>).familyName ?? null,
				}
			: undefined;

		if (profile) {
			console.log('[SocialLogin] loginWithApple: profile data extracted');
		} else {
			console.log('[SocialLogin] loginWithApple: no profile data (returning sign-in)');
		}

		console.log('[SocialLogin] loginWithApple: success');
		return {
			idToken: result.idToken,
			accessToken: result.accessToken?.token,
			nonce,
			profile,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.toLowerCase().includes('cancel')) {
			console.log('[SocialLogin] loginWithApple: cancelled by user');
		} else {
			console.error('[SocialLogin] loginWithApple: failed', error);
		}
		return null;
	}
}

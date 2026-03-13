/**
 * Platform detection utilities.
 *
 * Thin wrappers around `Capacitor.getPlatform()` for readable platform checks.
 *
 * @module
 */

import { Capacitor } from '@capacitor/core';

/** Returns `true` when running on iOS. */
export function isIOS(): boolean {
	return Capacitor.getPlatform() === 'ios';
}

/** Returns `true` when running on Android. */
export function isAndroid(): boolean {
	return Capacitor.getPlatform() === 'android';
}

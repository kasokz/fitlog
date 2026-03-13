/**
 * Haptics Service — semantic wrappers around @capacitor/haptics.
 *
 * Each function is fire-and-forget (returns void). On web or when Capacitor
 * is unavailable, calls silently no-op via try/catch. Debug logging is
 * included for dev-mode observability.
 *
 * @module
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/** Light impact — small, light UI element collision. */
export async function impactLight(): Promise<void> {
	try {
		console.debug('[Haptics] impactLight()');
		await Haptics.impact({ style: ImpactStyle.Light });
	} catch {
		// Web fallback — silently no-op
	}
}

/** Medium impact — moderately sized UI element collision. */
export async function impactMedium(): Promise<void> {
	try {
		console.debug('[Haptics] impactMedium()');
		await Haptics.impact({ style: ImpactStyle.Medium });
	} catch {
		// Web fallback — silently no-op
	}
}

/** Heavy impact — large, heavy UI element collision. */
export async function impactHeavy(): Promise<void> {
	try {
		console.debug('[Haptics] impactHeavy()');
		await Haptics.impact({ style: ImpactStyle.Heavy });
	} catch {
		// Web fallback — silently no-op
	}
}

/** Success notification — task completed successfully. */
export async function notifySuccess(): Promise<void> {
	try {
		console.debug('[Haptics] notifySuccess()');
		await Haptics.notification({ type: NotificationType.Success });
	} catch {
		// Web fallback — silently no-op
	}
}

/** Selection changed — haptic hint for UI selection changes. */
export async function selectionChanged(): Promise<void> {
	try {
		console.debug('[Haptics] selectionChanged()');
		await Haptics.selectionChanged();
	} catch {
		// Web fallback — silently no-op
	}
}

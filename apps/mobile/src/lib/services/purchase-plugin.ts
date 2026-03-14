/**
 * Purchase Plugin — typed wrapper around @capgo/native-purchases.
 *
 * Guards all calls with native-platform checks, returns safe defaults on web,
 * and logs diagnostics with `[PurchasePlugin]` prefix. This is the single
 * integration point for all in-app purchase operations consumed by downstream
 * services (premium state, purchase flows, restore logic).
 *
 * Every exported function:
 * - Checks `Capacitor.isNativePlatform()` before calling the native plugin
 * - Returns a typed safe default on web (false / [] / null / void)
 * - Wraps native calls in try/catch — never throws
 * - Logs outcome with `[PurchasePlugin]` prefix for observability
 *
 * @module
 */

import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import type { Product, Transaction } from '@capgo/native-purchases';

// ── Re-exports ──

export { PURCHASE_TYPE };
export type { Product, Transaction };

// ── Product & Plan ID Constants ──

/**
 * App Store / Google Play product identifiers.
 *
 * These must match the product IDs configured in App Store Connect
 * and Google Play Console exactly.
 */
export const PRODUCT_IDS = {
	PREMIUM_ANNUAL: 'com.fitlog.app.premium.annual',
	PREMIUM_MONTHLY: 'com.fitlog.app.premium.monthly',
	TEMPLATE_PACK: 'com.fitlog.app.templates.pack',
} as const;

/**
 * Google Play subscription base-plan identifiers.
 *
 * On Android, subscriptions require a `planIdentifier` to select the
 * specific base plan within the subscription product. iOS ignores this.
 */
export const PLAN_IDS = {
	ANNUAL: 'annual-plan',
	MONTHLY: 'monthly-plan',
} as const;

// ── Helpers ──

/** Returns true when running on a native platform (iOS/Android). */
function isNative(): boolean {
	return Capacitor.isNativePlatform();
}

// ── Wrapper Functions ──

/**
 * Check if the device supports in-app billing.
 *
 * @returns `true` if billing is supported, `false` on web or error.
 */
export async function isBillingSupported(): Promise<boolean> {
	if (!isNative()) {
		console.debug('[PurchasePlugin] isBillingSupported: skipped (web)');
		return false;
	}

	try {
		const result = await NativePurchases.isBillingSupported();
		console.log('[PurchasePlugin] isBillingSupported: success', result.isBillingSupported);
		return result.isBillingSupported;
	} catch (error) {
		console.error('[PurchasePlugin] isBillingSupported: failed', error);
		return false;
	}
}

/**
 * Fetch product information for multiple product identifiers.
 *
 * @param options.productIds - Array of product identifiers to look up.
 * @param options.productType - Product type filter (Android). Defaults to INAPP.
 * @returns Array of `Product` objects, or `[]` on web/error.
 */
export async function getProducts(
	options: { productIds: string[]; productType?: PURCHASE_TYPE },
): Promise<Product[]> {
	if (!isNative()) {
		console.debug('[PurchasePlugin] getProducts: skipped (web)');
		return [];
	}

	try {
		const { products } = await NativePurchases.getProducts({
			productIdentifiers: options.productIds,
			productType: options.productType,
		});
		console.log('[PurchasePlugin] getProducts: success', products.map((p) => p.identifier));
		return products;
	} catch (error) {
		console.error('[PurchasePlugin] getProducts: failed', error);
		return [];
	}
}

/**
 * Fetch product information for a single product identifier.
 *
 * Do not call this concurrently via `Promise.all` — the native billing
 * client does not support concurrent queries. Use `getProducts()` instead
 * for batch lookups.
 *
 * @param options.productId - The product identifier to look up.
 * @param options.productType - Product type filter (Android). Defaults to INAPP.
 * @returns The `Product` object, or `null` on web/error.
 */
export async function getProduct(
	options: { productId: string; productType?: PURCHASE_TYPE },
): Promise<Product | null> {
	if (!isNative()) {
		console.debug('[PurchasePlugin] getProduct: skipped (web)');
		return null;
	}

	try {
		const { product } = await NativePurchases.getProduct({
			productIdentifier: options.productId,
			productType: options.productType,
		});
		console.log('[PurchasePlugin] getProduct: success', product.identifier);
		return product;
	} catch (error) {
		console.error('[PurchasePlugin] getProduct: failed', error);
		return null;
	}
}

/**
 * Initiate a purchase for the given product.
 *
 * On Android, subscriptions require a `planIdentifier` to select the base
 * plan. A warning is logged if `productType` is SUBS and no `planIdentifier`
 * is provided.
 *
 * @param options.productId - The product identifier to purchase.
 * @param options.productType - Product type (INAPP or SUBS).
 * @param options.planIdentifier - Android subscription base-plan ID (required for SUBS on Android).
 * @returns The completed `Transaction`, or `null` on web/error.
 */
export async function purchaseProduct(
	options: { productId: string; productType?: PURCHASE_TYPE; planIdentifier?: string },
): Promise<Transaction | null> {
	if (!isNative()) {
		console.debug('[PurchasePlugin] purchaseProduct: skipped (web)');
		return null;
	}

	if (options.productType === PURCHASE_TYPE.SUBS && !options.planIdentifier) {
		console.warn(
			'[PurchasePlugin] purchaseProduct: SUBS type without planIdentifier — Android requires it',
			options.productId,
		);
	}

	try {
		const transaction = await NativePurchases.purchaseProduct({
			productIdentifier: options.productId,
			productType: options.productType,
			planIdentifier: options.planIdentifier,
		});
		console.log('[PurchasePlugin] purchaseProduct: success', {
			productId: transaction.productIdentifier,
			transactionId: transaction.transactionId,
		});
		return transaction;
	} catch (error) {
		console.error('[PurchasePlugin] purchaseProduct: failed', error);
		return null;
	}
}

/**
 * Get all of the user's current purchases (in-app and subscriptions).
 *
 * @returns Array of `Transaction` objects, or `[]` on web/error.
 */
export async function getPurchases(): Promise<Transaction[]> {
	if (!isNative()) {
		console.debug('[PurchasePlugin] getPurchases: skipped (web)');
		return [];
	}

	try {
		const { purchases } = await NativePurchases.getPurchases();
		console.log('[PurchasePlugin] getPurchases: success', purchases.length, 'purchases');
		return purchases;
	} catch (error) {
		console.error('[PurchasePlugin] getPurchases: failed', error);
		return [];
	}
}

/**
 * Restore the user's previous purchases and return the restored transactions.
 *
 * Calls the native restore flow, then fetches current purchases to return
 * the full list of restored transactions.
 *
 * @returns Array of restored `Transaction` objects, or `[]` on web/error.
 */
export async function restorePurchases(): Promise<Transaction[]> {
	if (!isNative()) {
		console.debug('[PurchasePlugin] restorePurchases: skipped (web)');
		return [];
	}

	try {
		await NativePurchases.restorePurchases();
		const { purchases } = await NativePurchases.getPurchases();
		console.log('[PurchasePlugin] restorePurchases: success', purchases.length, 'restored');
		return purchases;
	} catch (error) {
		console.error('[PurchasePlugin] restorePurchases: failed', error);
		return [];
	}
}

/**
 * Open the platform's native subscription management page.
 *
 * On iOS, opens the App Store subscription management. On Android, opens
 * Google Play subscription management. No-op on web.
 */
export async function manageSubscriptions(): Promise<void> {
	if (!isNative()) {
		console.debug('[PurchasePlugin] manageSubscriptions: skipped (web)');
		return;
	}

	try {
		await NativePurchases.manageSubscriptions();
		console.log('[PurchasePlugin] manageSubscriptions: success');
	} catch (error) {
		console.error('[PurchasePlugin] manageSubscriptions: failed', error);
	}
}

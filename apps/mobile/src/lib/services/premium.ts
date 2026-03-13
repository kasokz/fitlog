/**
 * Premium Service — manages premium subscription state via @capacitor/preferences.
 *
 * Provides granular product-tracking: maps individual store transactions to
 * per-product purchase records, persists state as JSON, and revalidates on
 * app launch/resume. Feature access is gated by product ownership via a
 * feature-to-product mapping.
 *
 * Dev override: when `PREMIUM_KEY` is set in Preferences (via `setPremiumStatus(true)`),
 * all premium checks return true regardless of actual purchase state.
 *
 * Uses Capacitor Preferences for persistence across app restarts.
 * Defaults to free (non-premium) when no preference is set — safe degradation.
 *
 * @module
 */

import { Preferences } from '@capacitor/preferences';
import { getPurchases, PRODUCT_IDS } from './purchase-plugin.js';
import type { Transaction } from './purchase-plugin.js';

// ── Keys ──

const PREMIUM_KEY = 'premium_status';
const PRODUCTS_KEY = 'purchased_products';

// ── Types ──

/**
 * A persisted record of a purchased product, derived from a store Transaction.
 */
export interface PurchasedProduct {
	productId: string;
	productType: 'subs' | 'inapp';
	isActive: boolean;
	purchaseDate: string;
	expirationDate?: string;
	transactionId: string;
}

/**
 * Features gated behind premium access.
 */
export enum PremiumFeature {
	full_charts = 'full_charts',
	extended_history = 'extended_history',
	progression_suggestions = 'progression_suggestions',
	volume_trends = 'volume_trends',
	premium_templates = 'premium_templates'
}

// ── Feature-to-Product Mapping ──

/**
 * Maps each premium feature to the product IDs that grant access to it.
 * A user can access a feature if they own ANY of the listed products with active status.
 */
const FEATURE_PRODUCT_MAP: Record<PremiumFeature, readonly string[]> = {
	[PremiumFeature.full_charts]: [PRODUCT_IDS.PREMIUM_ANNUAL, PRODUCT_IDS.PREMIUM_MONTHLY],
	[PremiumFeature.extended_history]: [PRODUCT_IDS.PREMIUM_ANNUAL, PRODUCT_IDS.PREMIUM_MONTHLY],
	[PremiumFeature.progression_suggestions]: [
		PRODUCT_IDS.PREMIUM_ANNUAL,
		PRODUCT_IDS.PREMIUM_MONTHLY
	],
	[PremiumFeature.volume_trends]: [PRODUCT_IDS.PREMIUM_ANNUAL, PRODUCT_IDS.PREMIUM_MONTHLY],
	[PremiumFeature.premium_templates]: [PRODUCT_IDS.TEMPLATE_PACK]
};

// ── Internal Helpers ──

/**
 * Check if a dev override is active (PREMIUM_KEY set in Preferences).
 */
async function hasDevOverride(): Promise<boolean> {
	try {
		const { value } = await Preferences.get({ key: PREMIUM_KEY });
		return value !== null;
	} catch {
		return false;
	}
}

/**
 * Load persisted product map from Preferences.
 * Returns empty map on missing data or JSON corruption (safe degradation).
 */
async function loadProducts(): Promise<Map<string, PurchasedProduct>> {
	try {
		const { value } = await Preferences.get({ key: PRODUCTS_KEY });
		if (value === null) {
			return new Map();
		}
		const parsed: [string, PurchasedProduct][] = JSON.parse(value);
		return new Map(parsed);
	} catch (error) {
		console.warn('[Premium] corrupted purchased_products data, resetting to empty', error);
		return new Map();
	}
}

/**
 * Persist the product map to Preferences as JSON.
 */
async function saveProducts(products: Map<string, PurchasedProduct>): Promise<void> {
	const serialized = JSON.stringify(Array.from(products.entries()));
	await Preferences.set({ key: PRODUCTS_KEY, value: serialized });
}

// ── Transaction Helpers ──

/**
 * Determine if a store Transaction represents an active purchase.
 *
 * Abstracts iOS/Android differences:
 * - iOS subscriptions: `isActive === true`, or `subscriptionState` in active states
 * - Android subscriptions: `purchaseState === "1"`
 * - iOS INAPP (non-consumable): presence in getPurchases() is sufficient (no `isActive` field)
 * - Android INAPP: `purchaseState === "1"` if present, otherwise true
 */
export function isTransactionActive(transaction: Transaction): boolean {
	const isSubs = transaction.productType === 'subs';

	if (isSubs) {
		// iOS subscription: check isActive first, then subscriptionState
		if (typeof transaction.isActive === 'boolean') {
			return transaction.isActive;
		}

		// iOS subscriptionState (iOS 15+)
		if (transaction.subscriptionState) {
			const activeStates = ['subscribed', 'inGracePeriod', 'inBillingRetryPeriod'];
			return activeStates.includes(transaction.subscriptionState);
		}

		// Android subscription: purchaseState === "1"
		if (typeof transaction.purchaseState === 'string') {
			return transaction.purchaseState === '1';
		}

		// Fallback: presence in getPurchases() suggests active
		return true;
	}

	// Non-consumable INAPP
	// Android: check purchaseState if present
	if (typeof transaction.purchaseState === 'string') {
		return transaction.purchaseState === '1';
	}

	// iOS INAPP: presence in getPurchases() is sufficient
	return true;
}

/**
 * Map a store Transaction to a PurchasedProduct record for persistence.
 */
export function mapTransactionToProduct(transaction: Transaction): PurchasedProduct {
	return {
		productId: transaction.productIdentifier,
		productType: transaction.productType === 'subs' ? 'subs' : 'inapp',
		isActive: isTransactionActive(transaction),
		purchaseDate: transaction.purchaseDate,
		expirationDate: transaction.expirationDate,
		transactionId: transaction.transactionId
	};
}

// ── Public API ──

/**
 * Check if the current user has premium access.
 * Returns true if dev override is set OR if any product is active.
 * Returns false when no preference is set (default = free user).
 * Signature unchanged: `() => Promise<boolean>`.
 */
export async function isPremiumUser(): Promise<boolean> {
	try {
		// Dev override takes priority
		if (await hasDevOverride()) {
			console.log('[Premium] isPremiumUser: true (dev override)');
			return true;
		}

		// Check product map for any active product
		const products = await loadProducts();
		const hasActive = Array.from(products.values()).some((p) => p.isActive);
		console.log(`[Premium] isPremiumUser: ${hasActive}`);
		return hasActive;
	} catch (error) {
		console.warn('[Premium] Failed to read premium status, defaulting to free', error);
		return false;
	}
}

/**
 * Set or remove premium status (dev override toggle).
 * - `active: true` — grants premium access by setting the preference key.
 * - `active: false` — revokes premium access by removing the preference key.
 */
export async function setPremiumStatus(active: boolean): Promise<void> {
	if (active) {
		await Preferences.set({ key: PREMIUM_KEY, value: 'true' });
		console.log('[Premium] Premium status set to active');
	} else {
		await Preferences.remove({ key: PREMIUM_KEY });
		console.log('[Premium] Premium status removed (free user)');
	}
}

/**
 * Check if the user can access a specific premium feature.
 * Dev override grants access to all features.
 * Otherwise checks if the user owns any product mapped to the feature.
 */
export async function canAccessFeature(feature: PremiumFeature): Promise<boolean> {
	// Dev override takes priority
	if (await hasDevOverride()) {
		console.log(`[Premium] canAccessFeature(${feature}): true (dev override)`);
		return true;
	}

	// Look up required products for this feature
	const requiredProducts = FEATURE_PRODUCT_MAP[feature];
	if (!requiredProducts || requiredProducts.length === 0) {
		console.log(`[Premium] canAccessFeature(${feature}): false (no product mapping)`);
		return false;
	}

	// Check product map for any matching active product
	const products = await loadProducts();
	const matchingProductIds = requiredProducts.filter((pid) => {
		const product = products.get(pid);
		return product?.isActive === true;
	});

	const result = matchingProductIds.length > 0;
	console.log(
		`[Premium] canAccessFeature(${feature}): ${result} (product check: [${matchingProductIds.join(', ')}])`
	);
	return result;
}

/**
 * Record a purchase from a completed store Transaction.
 * Maps the transaction to a PurchasedProduct, adds to the product map, and persists.
 */
export async function grantPurchase(transaction: Transaction): Promise<void> {
	const product = mapTransactionToProduct(transaction);
	const products = await loadProducts();
	products.set(product.productId, product);
	await saveProducts(products);
	console.log(`[Premium] granted: ${product.productId}`);
}

/**
 * Revalidate all purchases against the store.
 * Calls getPurchases() from the purchase plugin, maps each to PurchasedProduct,
 * and persists the reconciled state.
 *
 * If getPurchases() returns empty (web/error per D073), the existing persisted
 * state is preserved — does NOT overwrite with empty.
 */
export async function revalidatePurchases(): Promise<void> {
	try {
		const transactions = await getPurchases();

		// If getPurchases() returns empty (web or error), keep existing persisted state
		if (transactions.length === 0) {
			console.log('[Premium] revalidatePurchases: no transactions from store, keeping persisted state');
			return;
		}

		// Reconcile: map all transactions to products
		const products = new Map<string, PurchasedProduct>();
		for (const transaction of transactions) {
			const product = mapTransactionToProduct(transaction);
			products.set(product.productId, product);
		}

		await saveProducts(products);

		const activeCount = Array.from(products.values()).filter((p) => p.isActive).length;
		console.log(`[Premium] revalidated: ${activeCount} active products`);
	} catch (error) {
		console.warn('[Premium] revalidation failed, keeping persisted state', error);
	}
}

/**
 * Get all active products from persisted state.
 * Utility for future UI (e.g., subscription management screen).
 */
export async function getActiveProducts(): Promise<PurchasedProduct[]> {
	const products = await loadProducts();
	return Array.from(products.values()).filter((p) => p.isActive);
}

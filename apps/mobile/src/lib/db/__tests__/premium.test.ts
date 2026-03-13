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
		}
	}
}));

// ── Mock purchase-plugin ──

let mockTransactions: import('../../services/purchase-plugin.js').Transaction[] = [];

vi.mock('../../services/purchase-plugin.js', async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return {
		...actual,
		getPurchases: vi.fn(async () => mockTransactions)
	};
});

const {
	isPremiumUser,
	setPremiumStatus,
	canAccessFeature,
	PremiumFeature,
	grantPurchase,
	revalidatePurchases,
	getActiveProducts,
	isTransactionActive,
	mapTransactionToProduct
} = await import('../../services/premium.js');

const { PRODUCT_IDS } = await import('../../services/purchase-plugin.js');

// ── Test Helpers ──

/** Build a mock iOS subscription transaction. */
function mockIosSub(
	overrides: Partial<import('../../services/purchase-plugin.js').Transaction> = {}
): import('../../services/purchase-plugin.js').Transaction {
	return {
		transactionId: 'ios-sub-123',
		productIdentifier: PRODUCT_IDS.PREMIUM_ANNUAL,
		purchaseDate: '2026-01-01T00:00:00Z',
		productType: 'subs',
		isActive: true,
		expirationDate: '2027-01-01T00:00:00Z',
		subscriptionState: 'subscribed',
		willCancel: false,
		...overrides
	} as import('../../services/purchase-plugin.js').Transaction;
}

/** Build a mock Android subscription transaction. */
function mockAndroidSub(
	overrides: Partial<import('../../services/purchase-plugin.js').Transaction> = {}
): import('../../services/purchase-plugin.js').Transaction {
	return {
		transactionId: 'android-sub-456',
		productIdentifier: PRODUCT_IDS.PREMIUM_MONTHLY,
		purchaseDate: '2026-01-01T00:00:00Z',
		productType: 'subs',
		purchaseState: '1',
		isAcknowledged: true,
		willCancel: null,
		...overrides
	} as import('../../services/purchase-plugin.js').Transaction;
}

/** Build a mock iOS INAPP (non-consumable) transaction. */
function mockIosInapp(
	overrides: Partial<import('../../services/purchase-plugin.js').Transaction> = {}
): import('../../services/purchase-plugin.js').Transaction {
	return {
		transactionId: 'ios-inapp-789',
		productIdentifier: PRODUCT_IDS.TEMPLATE_PACK,
		purchaseDate: '2026-02-01T00:00:00Z',
		productType: 'inapp',
		willCancel: null,
		...overrides
	} as import('../../services/purchase-plugin.js').Transaction;
}

/** Build a mock Android INAPP transaction. */
function mockAndroidInapp(
	overrides: Partial<import('../../services/purchase-plugin.js').Transaction> = {}
): import('../../services/purchase-plugin.js').Transaction {
	return {
		transactionId: 'android-inapp-012',
		productIdentifier: PRODUCT_IDS.TEMPLATE_PACK,
		purchaseDate: '2026-02-01T00:00:00Z',
		productType: 'inapp',
		purchaseState: '1',
		isAcknowledged: true,
		willCancel: null,
		...overrides
	} as import('../../services/purchase-plugin.js').Transaction;
}

// ── Tests ──

describe('premium service', () => {
	beforeEach(() => {
		mockStorage.clear();
		mockTransactions = [];
	});

	afterEach(() => {
		mockStorage.clear();
		mockTransactions = [];
	});

	// ══════════════════════════════════════════════════════════════════════
	// Backward compatibility — original 14 assertions preserved
	// ══════════════════════════════════════════════════════════════════════

	// ── isPremiumUser ──

	it('defaults to free (false) when no preference is set', async () => {
		const result = await isPremiumUser();
		expect(result).toBe(false);
	});

	// ── setPremiumStatus ──

	it('setPremiumStatus(true) makes isPremiumUser return true', async () => {
		await setPremiumStatus(true);
		const result = await isPremiumUser();
		expect(result).toBe(true);
	});

	it('setPremiumStatus(false) removes the key, making isPremiumUser return false', async () => {
		await setPremiumStatus(true);
		expect(await isPremiumUser()).toBe(true);

		await setPremiumStatus(false);
		expect(await isPremiumUser()).toBe(false);
	});

	it('round-trip: free → premium → free → premium', async () => {
		expect(await isPremiumUser()).toBe(false);

		await setPremiumStatus(true);
		expect(await isPremiumUser()).toBe(true);

		await setPremiumStatus(false);
		expect(await isPremiumUser()).toBe(false);

		await setPremiumStatus(true);
		expect(await isPremiumUser()).toBe(true);
	});

	it('multiple setPremiumStatus(true) calls are idempotent', async () => {
		await setPremiumStatus(true);
		await setPremiumStatus(true);
		await setPremiumStatus(true);
		expect(await isPremiumUser()).toBe(true);
	});

	it('multiple setPremiumStatus(false) calls are idempotent', async () => {
		await setPremiumStatus(false);
		await setPremiumStatus(false);
		expect(await isPremiumUser()).toBe(false);
	});

	// ── canAccessFeature — free user ──

	it('canAccessFeature returns false for full_charts when free', async () => {
		expect(await canAccessFeature(PremiumFeature.full_charts)).toBe(false);
	});

	it('canAccessFeature returns false for extended_history when free', async () => {
		expect(await canAccessFeature(PremiumFeature.extended_history)).toBe(false);
	});

	it('canAccessFeature returns false for progression_suggestions when free', async () => {
		expect(await canAccessFeature(PremiumFeature.progression_suggestions)).toBe(false);
	});

	it('canAccessFeature returns false for volume_trends when free', async () => {
		expect(await canAccessFeature(PremiumFeature.volume_trends)).toBe(false);
	});

	// ── canAccessFeature — premium user (dev override) ──

	it('canAccessFeature returns true for full_charts when premium', async () => {
		await setPremiumStatus(true);
		expect(await canAccessFeature(PremiumFeature.full_charts)).toBe(true);
	});

	it('canAccessFeature returns true for extended_history when premium', async () => {
		await setPremiumStatus(true);
		expect(await canAccessFeature(PremiumFeature.extended_history)).toBe(true);
	});

	it('canAccessFeature returns true for progression_suggestions when premium', async () => {
		await setPremiumStatus(true);
		expect(await canAccessFeature(PremiumFeature.progression_suggestions)).toBe(true);
	});

	it('canAccessFeature returns true for volume_trends when premium', async () => {
		await setPremiumStatus(true);
		expect(await canAccessFeature(PremiumFeature.volume_trends)).toBe(true);
	});

	// ── PremiumFeature enum ──

	it('exports all expected PremiumFeature values', () => {
		expect(PremiumFeature.full_charts).toBe('full_charts');
		expect(PremiumFeature.extended_history).toBe('extended_history');
		expect(PremiumFeature.progression_suggestions).toBe('progression_suggestions');
		expect(PremiumFeature.volume_trends).toBe('volume_trends');
	});

	// ══════════════════════════════════════════════════════════════════════
	// New: PremiumFeature enum extension
	// ══════════════════════════════════════════════════════════════════════

	it('exports premium_templates in PremiumFeature enum', () => {
		expect(PremiumFeature.premium_templates).toBe('premium_templates');
	});

	// ══════════════════════════════════════════════════════════════════════
	// New: isTransactionActive
	// ══════════════════════════════════════════════════════════════════════

	describe('isTransactionActive', () => {
		it('iOS subscription active (isActive: true)', () => {
			const tx = mockIosSub({ isActive: true });
			expect(isTransactionActive(tx)).toBe(true);
		});

		it('iOS subscription expired (isActive: false, subscriptionState: expired)', () => {
			const tx = mockIosSub({
				isActive: false,
				subscriptionState: 'expired'
			});
			expect(isTransactionActive(tx)).toBe(false);
		});

		it('iOS subscription in grace period (subscriptionState)', () => {
			const tx = mockIosSub({
				isActive: undefined,
				subscriptionState: 'inGracePeriod'
			});
			expect(isTransactionActive(tx)).toBe(true);
		});

		it('iOS subscription in billing retry period', () => {
			const tx = mockIosSub({
				isActive: undefined,
				subscriptionState: 'inBillingRetryPeriod'
			});
			expect(isTransactionActive(tx)).toBe(true);
		});

		it('iOS subscription revoked (subscriptionState: revoked)', () => {
			const tx = mockIosSub({
				isActive: undefined,
				subscriptionState: 'revoked'
			});
			expect(isTransactionActive(tx)).toBe(false);
		});

		it('Android subscription valid (purchaseState: "1")', () => {
			const tx = mockAndroidSub({ purchaseState: '1', isAcknowledged: true });
			expect(isTransactionActive(tx)).toBe(true);
		});

		it('Android subscription pending (purchaseState: "0")', () => {
			const tx = mockAndroidSub({ purchaseState: '0' });
			expect(isTransactionActive(tx)).toBe(false);
		});

		it('iOS INAPP — presence is sufficient (no isActive field)', () => {
			const tx = mockIosInapp();
			expect(isTransactionActive(tx)).toBe(true);
		});

		it('Android INAPP valid (purchaseState: "1")', () => {
			const tx = mockAndroidInapp({ purchaseState: '1' });
			expect(isTransactionActive(tx)).toBe(true);
		});

		it('Android INAPP pending (purchaseState: "0")', () => {
			const tx = mockAndroidInapp({ purchaseState: '0' });
			expect(isTransactionActive(tx)).toBe(false);
		});
	});

	// ══════════════════════════════════════════════════════════════════════
	// New: PurchasedProduct persistence
	// ══════════════════════════════════════════════════════════════════════

	describe('PurchasedProduct persistence', () => {
		it('grantPurchase persists a transaction as PurchasedProduct', async () => {
			const tx = mockIosSub();
			await grantPurchase(tx);

			const products = await getActiveProducts();
			expect(products).toHaveLength(1);
			expect(products[0].productId).toBe(PRODUCT_IDS.PREMIUM_ANNUAL);
			expect(products[0].isActive).toBe(true);
			expect(products[0].transactionId).toBe('ios-sub-123');
			expect(products[0].productType).toBe('subs');
		});

		it('grantPurchase stores two different products', async () => {
			await grantPurchase(mockIosSub());
			await grantPurchase(mockIosInapp());

			const products = await getActiveProducts();
			expect(products).toHaveLength(2);

			const productIds = products.map((p) => p.productId);
			expect(productIds).toContain(PRODUCT_IDS.PREMIUM_ANNUAL);
			expect(productIds).toContain(PRODUCT_IDS.TEMPLATE_PACK);
		});

		it('corrupted JSON in preferences falls back to empty map', async () => {
			// Write corrupted data directly
			mockStorage.set('purchased_products', '{corrupted json!!!');

			const products = await getActiveProducts();
			expect(products).toHaveLength(0);
		});

		it('grantPurchase overwrites previous product with same productId', async () => {
			const tx1 = mockIosSub({ transactionId: 'old-tx' });
			await grantPurchase(tx1);

			const tx2 = mockIosSub({ transactionId: 'new-tx' });
			await grantPurchase(tx2);

			const products = await getActiveProducts();
			expect(products).toHaveLength(1);
			expect(products[0].transactionId).toBe('new-tx');
		});
	});

	// ══════════════════════════════════════════════════════════════════════
	// New: Feature-to-product mapping
	// ══════════════════════════════════════════════════════════════════════

	describe('feature-to-product mapping', () => {
		it('canAccessFeature(full_charts) true when annual sub active', async () => {
			await grantPurchase(mockIosSub({ productIdentifier: PRODUCT_IDS.PREMIUM_ANNUAL }));
			expect(await canAccessFeature(PremiumFeature.full_charts)).toBe(true);
		});

		it('canAccessFeature(full_charts) false when only template pack active', async () => {
			await grantPurchase(mockIosInapp());
			expect(await canAccessFeature(PremiumFeature.full_charts)).toBe(false);
		});

		it('canAccessFeature(premium_templates) true when template pack active', async () => {
			await grantPurchase(mockIosInapp());
			expect(await canAccessFeature(PremiumFeature.premium_templates)).toBe(true);
		});

		it('canAccessFeature(premium_templates) false when only sub active', async () => {
			await grantPurchase(mockIosSub());
			expect(await canAccessFeature(PremiumFeature.premium_templates)).toBe(false);
		});

		it('canAccessFeature(full_charts) true when monthly sub active', async () => {
			await grantPurchase(
				mockAndroidSub({ productIdentifier: PRODUCT_IDS.PREMIUM_MONTHLY })
			);
			expect(await canAccessFeature(PremiumFeature.full_charts)).toBe(true);
		});

		it('canAccessFeature(volume_trends) requires subscription, not template pack', async () => {
			await grantPurchase(mockIosInapp());
			expect(await canAccessFeature(PremiumFeature.volume_trends)).toBe(false);

			await grantPurchase(mockIosSub());
			expect(await canAccessFeature(PremiumFeature.volume_trends)).toBe(true);
		});
	});

	// ══════════════════════════════════════════════════════════════════════
	// New: Dev override priority
	// ══════════════════════════════════════════════════════════════════════

	describe('dev override priority', () => {
		it('canAccessFeature returns true with dev override even if empty product map', async () => {
			await setPremiumStatus(true);
			expect(await canAccessFeature(PremiumFeature.full_charts)).toBe(true);
			expect(await canAccessFeature(PremiumFeature.premium_templates)).toBe(true);
		});

		it('canAccessFeature returns false after clearing dev override with empty product map', async () => {
			await setPremiumStatus(true);
			expect(await canAccessFeature(PremiumFeature.full_charts)).toBe(true);

			await setPremiumStatus(false);
			expect(await canAccessFeature(PremiumFeature.full_charts)).toBe(false);
		});

		it('isPremiumUser returns true with dev override even if no products', async () => {
			await setPremiumStatus(true);
			expect(await isPremiumUser()).toBe(true);
		});

		it('isPremiumUser returns false after clearing dev override with no products', async () => {
			await setPremiumStatus(true);
			await setPremiumStatus(false);
			expect(await isPremiumUser()).toBe(false);
		});
	});

	// ══════════════════════════════════════════════════════════════════════
	// New: Revalidation
	// ══════════════════════════════════════════════════════════════════════

	describe('revalidation', () => {
		it('revalidatePurchases updates product map from store transactions', async () => {
			mockTransactions = [mockIosSub(), mockIosInapp()];

			await revalidatePurchases();

			const products = await getActiveProducts();
			expect(products).toHaveLength(2);
			const productIds = products.map((p) => p.productId);
			expect(productIds).toContain(PRODUCT_IDS.PREMIUM_ANNUAL);
			expect(productIds).toContain(PRODUCT_IDS.TEMPLATE_PACK);
		});

		it('revalidatePurchases does NOT clear existing state when getPurchases returns empty', async () => {
			// First grant a product
			await grantPurchase(mockIosSub());
			expect(await getActiveProducts()).toHaveLength(1);

			// Simulate web/error: getPurchases returns empty
			mockTransactions = [];
			await revalidatePurchases();

			// Existing state preserved
			const products = await getActiveProducts();
			expect(products).toHaveLength(1);
			expect(products[0].productId).toBe(PRODUCT_IDS.PREMIUM_ANNUAL);
		});

		it('revalidatePurchases reconciles expired subscriptions', async () => {
			// Grant an active sub
			await grantPurchase(mockIosSub({ isActive: true }));
			expect(await isPremiumUser()).toBe(true);

			// Revalidate with expired sub
			mockTransactions = [mockIosSub({ isActive: false, subscriptionState: 'expired' })];
			await revalidatePurchases();

			// Sub is now inactive
			const products = await getActiveProducts();
			expect(products).toHaveLength(0);
			expect(await isPremiumUser()).toBe(false);
		});

		it('revalidatePurchases replaces product map entirely with fresh data', async () => {
			// Grant annual sub and template pack
			await grantPurchase(mockIosSub());
			await grantPurchase(mockIosInapp());
			expect(await getActiveProducts()).toHaveLength(2);

			// Revalidate with only template pack
			mockTransactions = [mockIosInapp()];
			await revalidatePurchases();

			const products = await getActiveProducts();
			expect(products).toHaveLength(1);
			expect(products[0].productId).toBe(PRODUCT_IDS.TEMPLATE_PACK);
		});
	});

	// ══════════════════════════════════════════════════════════════════════
	// New: Backward compatibility — isPremiumUser with granular products
	// ══════════════════════════════════════════════════════════════════════

	describe('backward compat — isPremiumUser with products', () => {
		it('isPremiumUser returns true when subscription is active', async () => {
			await grantPurchase(mockIosSub());
			expect(await isPremiumUser()).toBe(true);
		});

		it('isPremiumUser returns true when template pack is active', async () => {
			await grantPurchase(mockIosInapp());
			expect(await isPremiumUser()).toBe(true);
		});

		it('isPremiumUser returns true when both subscription and template pack active', async () => {
			await grantPurchase(mockIosSub());
			await grantPurchase(mockIosInapp());
			expect(await isPremiumUser()).toBe(true);
		});

		it('isPremiumUser returns false when no products and no dev override', async () => {
			expect(await isPremiumUser()).toBe(false);
		});
	});

	// ══════════════════════════════════════════════════════════════════════
	// New: mapTransactionToProduct
	// ══════════════════════════════════════════════════════════════════════

	describe('mapTransactionToProduct', () => {
		it('maps iOS subscription correctly', () => {
			const tx = mockIosSub();
			const product = mapTransactionToProduct(tx);
			expect(product.productId).toBe(PRODUCT_IDS.PREMIUM_ANNUAL);
			expect(product.productType).toBe('subs');
			expect(product.isActive).toBe(true);
			expect(product.purchaseDate).toBe('2026-01-01T00:00:00Z');
			expect(product.expirationDate).toBe('2027-01-01T00:00:00Z');
			expect(product.transactionId).toBe('ios-sub-123');
		});

		it('maps iOS INAPP correctly (no expirationDate)', () => {
			const tx = mockIosInapp();
			const product = mapTransactionToProduct(tx);
			expect(product.productId).toBe(PRODUCT_IDS.TEMPLATE_PACK);
			expect(product.productType).toBe('inapp');
			expect(product.isActive).toBe(true);
			expect(product.expirationDate).toBeUndefined();
		});

		it('maps Android subscription correctly', () => {
			const tx = mockAndroidSub();
			const product = mapTransactionToProduct(tx);
			expect(product.productType).toBe('subs');
			expect(product.isActive).toBe(true);
		});
	});
});

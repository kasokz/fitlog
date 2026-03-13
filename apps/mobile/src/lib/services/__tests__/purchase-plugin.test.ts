import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @capacitor/core before importing the module under test
vi.mock('@capacitor/core', () => ({
	Capacitor: {
		isNativePlatform: vi.fn(() => false)
	}
}));

// Mock the native plugin to avoid actual native calls
vi.mock('@capgo/native-purchases', () => ({
	NativePurchases: {
		isBillingSupported: vi.fn(),
		getProducts: vi.fn(),
		getProduct: vi.fn(),
		purchaseProduct: vi.fn(),
		getPurchases: vi.fn(),
		restorePurchases: vi.fn(),
		manageSubscriptions: vi.fn()
	},
	PURCHASE_TYPE: {
		INAPP: 'inapp',
		SUBS: 'subs'
	}
}));

const {
	PRODUCT_IDS,
	PLAN_IDS,
	PURCHASE_TYPE,
	isBillingSupported,
	getProducts,
	getProduct,
	purchaseProduct,
	getPurchases,
	restorePurchases,
	manageSubscriptions
} = await import('../purchase-plugin.js');

import { Capacitor } from '@capacitor/core';

// ── Product ID Constants ──

describe('product ID constants', () => {
	it('PRODUCT_IDS.PREMIUM_ANNUAL equals com.fitlog.app.premium.annual', () => {
		expect(PRODUCT_IDS.PREMIUM_ANNUAL).toBe('com.fitlog.app.premium.annual');
	});

	it('PRODUCT_IDS.PREMIUM_MONTHLY equals com.fitlog.app.premium.monthly', () => {
		expect(PRODUCT_IDS.PREMIUM_MONTHLY).toBe('com.fitlog.app.premium.monthly');
	});

	it('PRODUCT_IDS.TEMPLATE_PACK equals com.fitlog.app.templates.pack', () => {
		expect(PRODUCT_IDS.TEMPLATE_PACK).toBe('com.fitlog.app.templates.pack');
	});

	it('PLAN_IDS.ANNUAL exists for Android subscriptions', () => {
		expect(PLAN_IDS.ANNUAL).toBeDefined();
		expect(typeof PLAN_IDS.ANNUAL).toBe('string');
	});

	it('PLAN_IDS.MONTHLY exists for Android subscriptions', () => {
		expect(PLAN_IDS.MONTHLY).toBeDefined();
		expect(typeof PLAN_IDS.MONTHLY).toBe('string');
	});
});

// ── Function Exports ──

describe('function exports', () => {
	it('isBillingSupported is exported and is a function', () => {
		expect(isBillingSupported).toBeDefined();
		expect(typeof isBillingSupported).toBe('function');
	});

	it('getProducts is exported and is a function', () => {
		expect(getProducts).toBeDefined();
		expect(typeof getProducts).toBe('function');
	});

	it('getProduct is exported and is a function', () => {
		expect(getProduct).toBeDefined();
		expect(typeof getProduct).toBe('function');
	});

	it('purchaseProduct is exported and is a function', () => {
		expect(purchaseProduct).toBeDefined();
		expect(typeof purchaseProduct).toBe('function');
	});

	it('getPurchases is exported and is a function', () => {
		expect(getPurchases).toBeDefined();
		expect(typeof getPurchases).toBe('function');
	});

	it('restorePurchases is exported and is a function', () => {
		expect(restorePurchases).toBeDefined();
		expect(typeof restorePurchases).toBe('function');
	});

	it('manageSubscriptions is exported and is a function', () => {
		expect(manageSubscriptions).toBeDefined();
		expect(typeof manageSubscriptions).toBe('function');
	});
});

// ── Platform Guard Behavior ──

describe('platform guard behavior (non-native)', () => {
	beforeEach(() => {
		vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
	});

	it('isBillingSupported() returns false on web', async () => {
		const result = await isBillingSupported();
		expect(result).toBe(false);
	});

	it('getProducts() returns empty array on web', async () => {
		const result = await getProducts({ productIds: [PRODUCT_IDS.PREMIUM_ANNUAL] });
		expect(result).toEqual([]);
	});

	it('purchaseProduct() returns null on web', async () => {
		const result = await purchaseProduct({ productId: PRODUCT_IDS.PREMIUM_ANNUAL });
		expect(result).toBeNull();
	});

	it('getPurchases() returns empty array on web', async () => {
		const result = await getPurchases();
		expect(result).toEqual([]);
	});

	it('restorePurchases() returns empty array on web', async () => {
		const result = await restorePurchases();
		expect(result).toEqual([]);
	});
});

// ── Type Re-exports ──

describe('type re-exports', () => {
	it('PURCHASE_TYPE enum is re-exported with INAPP value', () => {
		expect(PURCHASE_TYPE).toBeDefined();
		expect(PURCHASE_TYPE.INAPP).toBe('inapp');
	});

	it('PURCHASE_TYPE enum is re-exported with SUBS value', () => {
		expect(PURCHASE_TYPE.SUBS).toBe('subs');
	});
});

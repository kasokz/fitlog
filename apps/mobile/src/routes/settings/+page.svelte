<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale, setLocale } from '$lib/paraglide/runtime.js';
	import { userPrefersMode, setMode } from 'mode-watcher';
	import * as ToggleGroup from '@repo/ui/components/ui/toggle-group';
	import { Switch } from '@repo/ui/components/ui/switch';
	import { Button } from '@repo/ui/components/ui/button';
	import { Sun, Moon, Monitor, Globe, RotateCcw, ExternalLink, LoaderCircle } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { isPremiumUser, setPremiumStatus, getActiveProducts, revalidatePurchases } from '$lib/services/premium.js';
	import type { PurchasedProduct } from '$lib/services/premium.js';
	import {
		isBillingSupported,
		getProducts,
		purchaseProduct,
		restorePurchases,
		manageSubscriptions,
		PRODUCT_IDS,
		PLAN_IDS,
		PURCHASE_TYPE,
	} from '$lib/services/purchase-plugin.js';
	import type { Product } from '$lib/services/purchase-plugin.js';

	let premiumActive = $state(false);

	// Production subscription section state
	let activeProducts: PurchasedProduct[] = $state([]);
	let restoring = $state(false);
	let hasActiveSubscription = $derived(
		activeProducts.some((p) => p.productType === 'subs')
	);

	// IAP test state (dev only, but declared unconditionally for simplicity)
	let billingSupported: boolean | null = $state(null);
	let products: Product[] = $state([]);
	let lastResult: { message: string; success: boolean } | null = $state(null);
	let loading = $state(false);

	$effect(() => {
		isPremiumUser().then((status) => {
			premiumActive = status;
		});
	});

	// Load active products on mount for the subscription section
	$effect(() => {
		refreshActiveProducts();
	});

	$effect(() => {
		if (import.meta.env.DEV) {
			isBillingSupported().then((supported) => {
				billingSupported = supported;
			});
		}
	});

	async function refreshActiveProducts() {
		activeProducts = await getActiveProducts();
	}

	async function handleProductionRestore() {
		restoring = true;
		try {
			const restored = await restorePurchases();
			await revalidatePurchases();
			await refreshActiveProducts();
			// Re-check premium status after restore
			premiumActive = await isPremiumUser();

			if (restored.length > 0) {
				toast.success(m.settings_subscription_restore_success({ count: restored.length }));
			} else {
				toast.info(m.settings_subscription_restore_none());
			}
		} catch (error) {
			toast.error(m.settings_subscription_restore_error({ error: String(error) }));
		} finally {
			restoring = false;
		}
	}

	async function handleManageSubscription() {
		await manageSubscriptions();
	}

	async function handlePremiumToggle(checked: boolean) {
		premiumActive = checked;
		await setPremiumStatus(checked);
	}

	async function handleLoadProducts() {
		loading = true;
		lastResult = null;
		try {
			const subs = await getProducts({
				productIds: [PRODUCT_IDS.PREMIUM_ANNUAL, PRODUCT_IDS.PREMIUM_MONTHLY],
				productType: PURCHASE_TYPE.SUBS,
			});
			const inapp = await getProducts({
				productIds: [PRODUCT_IDS.TEMPLATE_PACK],
				productType: PURCHASE_TYPE.INAPP,
			});
			products = [...subs, ...inapp];
			lastResult = {
				message: `${products.length} product(s) loaded`,
				success: true,
			};
		} catch (error) {
			lastResult = {
				message: m.settings_iap_transaction_error({ error: String(error) }),
				success: false,
			};
		} finally {
			loading = false;
		}
	}

	async function handlePurchaseAnnual() {
		loading = true;
		lastResult = null;
		try {
			const transaction = await purchaseProduct({
				productId: PRODUCT_IDS.PREMIUM_ANNUAL,
				productType: PURCHASE_TYPE.SUBS,
				planIdentifier: PLAN_IDS.ANNUAL,
			});
			if (transaction) {
				lastResult = {
					message: m.settings_iap_transaction_success({ id: transaction.transactionIdentifier }),
					success: true,
				};
			} else {
				lastResult = {
					message: m.settings_iap_transaction_error({ error: 'No transaction returned' }),
					success: false,
				};
			}
		} catch (error) {
			lastResult = {
				message: m.settings_iap_transaction_error({ error: String(error) }),
				success: false,
			};
		} finally {
			loading = false;
		}
	}

	async function handleRestorePurchases() {
		loading = true;
		lastResult = null;
		try {
			const restored = await restorePurchases();
			lastResult = {
				message: m.settings_iap_restored_count({ count: restored.length }),
				success: true,
			};
		} catch (error) {
			lastResult = {
				message: m.settings_iap_transaction_error({ error: String(error) }),
				success: false,
			};
		} finally {
			loading = false;
		}
	}

	function handleModeChange(value: string | undefined) {
		if (value === 'system' || value === 'light' || value === 'dark') {
			setMode(value);
		}
	}

	function handleLocaleChange(value: string | undefined) {
		if (value === 'de' || value === 'en') {
			setLocale(value);
		}
	}
</script>

<section class="container mx-auto max-w-lg px-4 py-4">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="text-2xl font-bold">{m.settings_title()}</h1>
	</div>

	<!-- Theme Section -->
	<div class="space-y-3">
		<h2 class="text-sm font-bold uppercase tracking-wide text-muted-foreground">{m.settings_theme_label()}</h2>
		<ToggleGroup.Root
			type="single"
			value={userPrefersMode.current}
			onValueChange={handleModeChange}
			variant="outline"
			class="w-full"
		>
			<ToggleGroup.Item value="system" class="flex-1 gap-2">
				<Monitor class="size-4" />
				{m.settings_theme_system()}
			</ToggleGroup.Item>
			<ToggleGroup.Item value="light" class="flex-1 gap-2">
				<Sun class="size-4" />
				{m.settings_theme_light()}
			</ToggleGroup.Item>
			<ToggleGroup.Item value="dark" class="flex-1 gap-2">
				<Moon class="size-4" />
				{m.settings_theme_dark()}
			</ToggleGroup.Item>
		</ToggleGroup.Root>
	</div>

	<!-- Language Section -->
	<div class="space-y-3 mt-6">
		<h2 class="text-sm font-bold uppercase tracking-wide text-muted-foreground">{m.settings_language_label()}</h2>
		<ToggleGroup.Root
			type="single"
			value={getLocale()}
			onValueChange={handleLocaleChange}
			variant="outline"
			class="w-full"
		>
			<ToggleGroup.Item value="de" class="flex-1 gap-2">
				<Globe class="size-4" />
				{m.settings_language_de()}
			</ToggleGroup.Item>
			<ToggleGroup.Item value="en" class="flex-1 gap-2">
				<Globe class="size-4" />
				{m.settings_language_en()}
			</ToggleGroup.Item>
		</ToggleGroup.Root>
	</div>

	<!-- Subscription Section (visible to ALL users) -->
	<div class="space-y-3 mt-6">
		<h2 class="text-sm font-bold uppercase tracking-wide text-muted-foreground">{m.settings_subscription_label()}</h2>

		<!-- Current plan display -->
		<div class="flex items-center justify-between rounded-md border px-4 py-3">
			<span class="text-sm font-medium">{m.settings_subscription_current_plan()}</span>
			<span class="text-sm text-muted-foreground">
				{#if activeProducts.length > 0}
					{activeProducts.map((p) => p.productId.split('.').pop()).join(', ')}
				{:else}
					{m.settings_subscription_free()}
				{/if}
			</span>
		</div>

		<!-- Restore Purchases button -->
		<Button
			variant="outline"
			class="w-full justify-center gap-2"
			disabled={restoring}
			onclick={handleProductionRestore}
		>
			{#if restoring}
				<LoaderCircle class="size-4 animate-spin" />
			{:else}
				<RotateCcw class="size-4" />
			{/if}
			{m.settings_subscription_restore()}
		</Button>

		<!-- Manage Subscription button (only when subscribed) -->
		{#if hasActiveSubscription}
			<Button
				variant="outline"
				class="w-full justify-center gap-2"
				onclick={handleManageSubscription}
			>
				<ExternalLink class="size-4" />
				{m.settings_subscription_manage()}
			</Button>
		{/if}
	</div>

	<!-- Premium Dev Toggle (dev mode only) -->
	{#if import.meta.env.DEV}
		<div class="space-y-3 mt-6">
			<h2 class="text-sm font-bold uppercase tracking-wide text-muted-foreground">{m.settings_premium_dev_label()}</h2>
			<div class="flex items-center justify-between rounded-md border px-4 py-3">
				<span class="text-sm font-medium">
					{premiumActive ? m.settings_premium_active() : m.settings_premium_inactive()}
				</span>
				<Switch
					checked={premiumActive}
					onCheckedChange={handlePremiumToggle}
				/>
			</div>
		</div>

		<!-- IAP Testing (dev mode only) -->
		<div class="space-y-3 mt-6">
			<h2 class="text-sm font-bold uppercase tracking-wide text-muted-foreground">{m.settings_iap_test_label()}</h2>

			<!-- Billing status -->
			<div class="flex items-center justify-between rounded-md border px-4 py-3">
				<span class="text-sm font-medium">{m.settings_iap_billing_supported()}</span>
				{#if billingSupported === null}
					<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{m.settings_iap_billing_checking()}</span>
				{:else if billingSupported}
					<span class="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200">Supported</span>
				{:else}
					<span class="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-900 dark:text-red-200">{m.settings_iap_billing_not_supported()}</span>
				{/if}
			</div>

			<!-- Action buttons -->
			<div class="flex flex-col gap-2">
				<Button
					variant="outline"
					class="w-full justify-center"
					disabled={loading || !billingSupported}
					onclick={handleLoadProducts}
				>
					{m.settings_iap_load_products()}
				</Button>
				<Button
					variant="outline"
					class="w-full justify-center"
					disabled={loading || !billingSupported}
					onclick={handlePurchaseAnnual}
				>
					{m.settings_iap_purchase_annual()}
				</Button>
				<Button
					variant="outline"
					class="w-full justify-center"
					disabled={loading || !billingSupported}
					onclick={handleRestorePurchases}
				>
					{m.settings_iap_restore()}
				</Button>
			</div>

			<!-- Product list -->
			{#if products.length > 0}
				<div class="space-y-1 rounded-md border px-4 py-3">
					{#each products as product}
						<div class="flex items-center justify-between text-sm">
							<span class="font-medium">{product.title}</span>
							<span class="text-muted-foreground">{product.price} — <code class="text-xs">{product.identifier}</code></span>
						</div>
					{/each}
				</div>
			{:else if billingSupported !== null}
				<p class="text-xs text-muted-foreground">{m.settings_iap_no_products()}</p>
			{/if}

			<!-- Result display -->
			{#if lastResult}
				<div class="rounded-md border px-4 py-3 text-sm {lastResult.success ? 'border-green-500 text-green-700 dark:text-green-300' : 'border-red-500 text-red-700 dark:text-red-300'}">
					{lastResult.message}
				</div>
			{/if}
		</div>
	{/if}
</section>

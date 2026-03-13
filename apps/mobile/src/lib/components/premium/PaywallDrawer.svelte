<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import * as Drawer from '@repo/ui/components/ui/drawer';
	import { Button } from '@repo/ui/components/ui/button';
	import { Loader2, AlertCircle, ExternalLink } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	import {
		getProducts,
		purchaseProduct,
		restorePurchases,
		PRODUCT_IDS,
		PLAN_IDS,
		PURCHASE_TYPE,
	} from '$lib/services/purchase-plugin.js';
	import type { Product } from '$lib/services/purchase-plugin.js';
	import { grantPurchase, revalidatePurchases } from '$lib/services/premium.js';
	import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from './paywall-constants.js';

	// ── Props ──

	interface Props {
		open: boolean;
		onpurchasecomplete?: () => void;
	}

	let { open = $bindable(false), onpurchasecomplete }: Props = $props();

	// ── Internal State ──

	/** All loaded products (subscriptions + in-app) */
	let products = $state<Product[]>([]);
	let loading = $state(false);
	let errorState = $state(false);
	/** Track which product is currently being purchased (by identifier) */
	let purchasingProductId = $state<string | null>(null);
	let restoring = $state(false);

	// ── Derived: split products by type ──

	const subscriptionIds = new Set([PRODUCT_IDS.PREMIUM_ANNUAL, PRODUCT_IDS.PREMIUM_MONTHLY]);
	const templatePackIds = new Set([PRODUCT_IDS.TEMPLATE_PACK]);

	const subscriptionProducts = $derived(
		products.filter((p) => subscriptionIds.has(p.identifier))
	);
	const templatePackProducts = $derived(
		products.filter((p) => templatePackIds.has(p.identifier))
	);

	// ── Product Loading ──

	async function loadProducts() {
		loading = true;
		errorState = false;
		products = [];

		console.log('[Paywall] loading products');

		try {
			// Fetch subscriptions and in-app products sequentially
			// (native billing client doesn't support concurrent queries)
			const subs = await getProducts({
				productIds: [PRODUCT_IDS.PREMIUM_ANNUAL, PRODUCT_IDS.PREMIUM_MONTHLY],
				productType: PURCHASE_TYPE.SUBS,
			});
			const inapp = await getProducts({
				productIds: [PRODUCT_IDS.TEMPLATE_PACK],
				productType: PURCHASE_TYPE.INAPP,
			});

			const allProducts = [...subs, ...inapp];

			if (allProducts.length === 0) {
				console.warn('[Paywall] products loaded: 0 (empty — showing error state)');
				errorState = true;
			} else {
				console.log(`[Paywall] products loaded: ${allProducts.length}`);
				products = allProducts;
			}
		} catch (err) {
			console.error('[Paywall] products failed', err);
			errorState = true;
		} finally {
			loading = false;
		}
	}

	// ── Load products when drawer opens ──

	$effect(() => {
		if (open) {
			console.log('[Paywall] drawer opened');
			loadProducts();
		}
	});

	// ── Purchase Flow ──

	function getPlanIdentifier(productId: string): string | undefined {
		switch (productId) {
			case PRODUCT_IDS.PREMIUM_ANNUAL:
				return PLAN_IDS.ANNUAL;
			case PRODUCT_IDS.PREMIUM_MONTHLY:
				return PLAN_IDS.MONTHLY;
			default:
				return undefined;
		}
	}

	function getProductType(productId: string): PURCHASE_TYPE {
		return subscriptionIds.has(productId) ? PURCHASE_TYPE.SUBS : PURCHASE_TYPE.INAPP;
	}

	async function handlePurchase(product: Product) {
		const productId = product.identifier;
		const productType = getProductType(productId);
		const planIdentifier = getPlanIdentifier(productId);

		console.log(`[Paywall] purchase initiated: ${productId}`);
		purchasingProductId = productId;

		try {
			const transaction = await purchaseProduct({
				productId,
				productType,
				planIdentifier,
			});

			if (transaction === null) {
				// User cancelled or web — no error toast per spec
				console.log(`[Paywall] purchase cancelled: ${productId}`);
				purchasingProductId = null;
				return;
			}

			// Success: persist state, close drawer, notify
			await grantPurchase(transaction);
			console.log(`[Paywall] purchase complete: ${productId}`);

			open = false;
			toast.success(m.paywall_purchase_success());
			onpurchasecomplete?.();
		} catch (err) {
			console.error(`[Paywall] purchase error: ${productId}`, err);
		} finally {
			purchasingProductId = null;
		}
	}

	// ── Restore Purchases ──

	async function handleRestore() {
		console.log('[Paywall] restore initiated');
		restoring = true;

		try {
			const transactions = await restorePurchases();

			if (transactions.length > 0) {
				// Revalidate persisted state from restored transactions
				await revalidatePurchases();
				console.log(`[Paywall] restore complete: ${transactions.length} transactions`);
				open = false;
				toast.success(m.paywall_purchase_success());
				onpurchasecomplete?.();
			} else {
				console.log('[Paywall] restore complete: no transactions found');
			}
		} catch (err) {
			console.error('[Paywall] restore failed', err);
		} finally {
			restoring = false;
		}
	}

	// ── Helpers ──

	function getPeriodSuffix(productId: string): string {
		if (productId === PRODUCT_IDS.PREMIUM_ANNUAL) return m.paywall_per_year();
		if (productId === PRODUCT_IDS.PREMIUM_MONTHLY) return m.paywall_per_month();
		return '';
	}

	function getPurchaseLabel(productId: string): string {
		return subscriptionIds.has(productId)
			? m.paywall_purchase_subscription()
			: m.paywall_purchase_template_pack();
	}
</script>

<Drawer.Root bind:open>
	<Drawer.Content>
		<Drawer.Header>
			<Drawer.Title>{m.paywall_title()}</Drawer.Title>
			<Drawer.Description>{m.paywall_subtitle()}</Drawer.Description>
		</Drawer.Header>

		<div class="flex flex-col gap-6 overflow-y-auto px-4 pb-8">
			<!-- Loading State -->
			{#if loading}
				<div class="flex flex-col items-center justify-center py-12">
					<Loader2 class="text-muted-foreground size-8 animate-spin" />
					<p class="text-muted-foreground mt-3 text-sm">{m.paywall_loading()}</p>
				</div>

			<!-- Error State -->
			{:else if errorState}
				<div class="flex flex-col items-center justify-center gap-4 py-12">
					<div class="bg-destructive/10 rounded-full p-3">
						<AlertCircle class="text-destructive size-6" />
					</div>
					<p class="text-muted-foreground text-center text-sm">
						{m.paywall_error_unavailable()}
					</p>
					<Button variant="outline" onclick={loadProducts}>
						{m.paywall_error_retry()}
					</Button>
				</div>

			<!-- Loaded State -->
			{:else}
				<!-- Subscription Products -->
				{#if subscriptionProducts.length > 0}
					<div>
						<h3 class="mb-3 text-sm font-semibold uppercase tracking-wide">
							{m.paywall_section_subscriptions()}
						</h3>
						<div class="space-y-3">
							{#each subscriptionProducts as product (product.identifier)}
								{@const isPurchasing = purchasingProductId === product.identifier}
								<div class="border-2 border-border bg-card p-4 shadow-sm">
									<div class="mb-3 flex items-baseline justify-between">
										<span class="text-base font-bold">{product.title}</span>
										<span class="text-primary font-mono text-sm font-semibold">
											{product.priceString}{getPeriodSuffix(product.identifier)}
										</span>
									</div>
									<Button
										class="w-full"
										disabled={purchasingProductId !== null}
										onclick={() => handlePurchase(product)}
									>
										{#if isPurchasing}
											<Loader2 class="mr-2 size-4 animate-spin" />
										{/if}
										{getPurchaseLabel(product.identifier)}
									</Button>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Template Pack Products -->
				{#if templatePackProducts.length > 0}
					<div>
						<h3 class="mb-3 text-sm font-semibold uppercase tracking-wide">
							{m.paywall_section_template_pack()}
						</h3>
						<div class="space-y-3">
							{#each templatePackProducts as product (product.identifier)}
								{@const isPurchasing = purchasingProductId === product.identifier}
								<div class="border-2 border-border bg-card p-4 shadow-sm">
									<div class="mb-3 flex items-baseline justify-between">
										<span class="text-base font-bold">{product.title}</span>
										<span class="text-primary font-mono text-sm font-semibold">
											{product.priceString}
										</span>
									</div>
									<Button
										class="w-full"
										disabled={purchasingProductId !== null}
										onclick={() => handlePurchase(product)}
									>
										{#if isPurchasing}
											<Loader2 class="mr-2 size-4 animate-spin" />
										{/if}
										{getPurchaseLabel(product.identifier)}
									</Button>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Apple Subscription Terms -->
				<div class="text-muted-foreground space-y-2 text-xs leading-relaxed">
					<p>{m.paywall_terms_auto_renewal()}</p>
					<p>{m.paywall_terms_cancellation()}</p>
				</div>

				<!-- Legal Links -->
				<div class="flex items-center justify-center gap-4">
					<a
						href={PRIVACY_POLICY_URL}
						target="_blank"
						rel="noopener noreferrer"
						class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline"
					>
						{m.paywall_privacy_policy()}
						<ExternalLink class="size-3" />
					</a>
					<a
						href={TERMS_OF_SERVICE_URL}
						target="_blank"
						rel="noopener noreferrer"
						class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline"
					>
						{m.paywall_terms_of_service()}
						<ExternalLink class="size-3" />
					</a>
				</div>

				<!-- Restore Purchases -->
				<div class="flex justify-center pb-2">
					<Button
						variant="ghost"
						size="sm"
						class="text-muted-foreground text-xs"
						disabled={restoring || purchasingProductId !== null}
						onclick={handleRestore}
					>
						{#if restoring}
							<Loader2 class="mr-2 size-3 animate-spin" />
						{/if}
						{m.paywall_restore_purchases()}
					</Button>
				</div>
			{/if}
		</div>
	</Drawer.Content>
</Drawer.Root>

<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Badge } from '@repo/ui/components/ui/badge';
	import { Button } from '@repo/ui/components/ui/button';
	import { LoaderCircle, Mail } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	import {
		getLinkedAccounts,
		linkSocialAccount,
		unlinkAccount,
	} from '$lib/services/auth-client.js';
	import type { LinkedAccount } from '$lib/services/auth-client.js';
	import { loginWithGoogle, loginWithApple } from '$lib/services/social-login-plugin.js';
	import { isIOS } from '$lib/utils/platform.js';

	// ── State ──

	let accounts: LinkedAccount[] = $state([]);
	let loadingAccounts = $state(true);
	let actionInProgress = $state<string | null>(null);

	// ── Derived ──

	let linkedProviderIds = $derived(new Set(accounts.map((a) => a.providerId)));
	let isLastAccount = $derived(accounts.length <= 1);

	// ── Load on mount ──

	$effect(() => {
		loadAccounts();
	});

	async function loadAccounts() {
		loadingAccounts = true;
		const result = await getLinkedAccounts();
		if (result.success) {
			accounts = result.accounts;
		}
		loadingAccounts = false;
	}

	// ── Connect handlers ──

	async function handleConnectGoogle() {
		if (actionInProgress) return;
		actionInProgress = 'google';

		try {
			const pluginResult = await loginWithGoogle();

			// User cancelled — exit silently (D081/D130 precedent)
			if (!pluginResult) {
				actionInProgress = null;
				return;
			}

			const result = await linkSocialAccount(
				'google',
				pluginResult.idToken,
				pluginResult.accessToken,
			);

			if (result.success) {
				toast.success(
					m.connected_accounts_connect_success({
						provider: m.connected_accounts_provider_google(),
					}),
				);
				await loadAccounts();
			} else {
				toast.error(
					result.error ??
						m.connected_accounts_connect_error({
							provider: m.connected_accounts_provider_google(),
						}),
				);
			}
		} catch (err) {
			console.error('[ConnectedAccounts] Google connect error:', err);
			toast.error(
				m.connected_accounts_connect_error({
					provider: m.connected_accounts_provider_google(),
				}),
			);
		} finally {
			actionInProgress = null;
		}
	}

	async function handleConnectApple() {
		if (actionInProgress) return;
		actionInProgress = 'apple';

		try {
			const nonce = crypto.randomUUID();
			const pluginResult = await loginWithApple(nonce);

			// User cancelled — exit silently (D081/D130 precedent)
			if (!pluginResult) {
				actionInProgress = null;
				return;
			}

			const result = await linkSocialAccount(
				'apple',
				pluginResult.idToken,
				pluginResult.accessToken,
				nonce,
			);

			if (result.success) {
				toast.success(
					m.connected_accounts_connect_success({
						provider: m.connected_accounts_provider_apple(),
					}),
				);
				await loadAccounts();
			} else {
				toast.error(
					result.error ??
						m.connected_accounts_connect_error({
							provider: m.connected_accounts_provider_apple(),
						}),
				);
			}
		} catch (err) {
			console.error('[ConnectedAccounts] Apple connect error:', err);
			toast.error(
				m.connected_accounts_connect_error({
					provider: m.connected_accounts_provider_apple(),
				}),
			);
		} finally {
			actionInProgress = null;
		}
	}

	// ── Disconnect handler ──

	async function handleDisconnect(providerId: string, providerLabel: string) {
		if (actionInProgress) return;

		// Last-account guard (UI-level, server also enforces)
		if (isLastAccount) {
			toast.error(m.connected_accounts_last_account_warning());
			return;
		}

		// Confirmation via window.confirm (lightweight, works on native webview)
		const confirmed = window.confirm(
			m.connected_accounts_disconnect_confirm({ provider: providerLabel }),
		);
		if (!confirmed) return;

		actionInProgress = providerId;

		try {
			const result = await unlinkAccount(providerId);

			if (result.success) {
				toast.success(
					m.connected_accounts_disconnect_success({ provider: providerLabel }),
				);
				await loadAccounts();
			} else {
				toast.error(
					result.error ??
						m.connected_accounts_disconnect_error({ provider: providerLabel }),
				);
			}
		} catch (err) {
			console.error(`[ConnectedAccounts] Disconnect ${providerId} error:`, err);
			toast.error(
				m.connected_accounts_disconnect_error({ provider: providerLabel }),
			);
		} finally {
			actionInProgress = null;
		}
	}
</script>

<div class="space-y-3 mt-6">
	<h2 class="text-sm font-bold uppercase tracking-wide text-muted-foreground">
		{m.connected_accounts_section()}
	</h2>

	{#if loadingAccounts}
		<div class="flex items-center justify-center rounded-md border px-4 py-3">
			<LoaderCircle class="size-4 animate-spin mr-2" />
			<span class="text-sm text-muted-foreground">{m.connected_accounts_loading()}</span>
		</div>
	{:else}
		<!-- Email / Credential -->
		<div class="flex items-center justify-between rounded-md border px-4 py-3">
			<div class="flex items-center gap-3">
				<Mail class="size-5 text-muted-foreground" />
				<span class="text-sm font-medium">{m.connected_accounts_provider_email()}</span>
			</div>
			<div class="flex items-center gap-2">
				{#if linkedProviderIds.has('credential')}
					<Badge variant="default">{m.connected_accounts_status_connected()}</Badge>
				{:else}
					<Badge variant="secondary">{m.connected_accounts_status_not_connected()}</Badge>
				{/if}
				{#if linkedProviderIds.has('credential')}
					<Button
						variant="ghost"
						size="sm"
						disabled={isLastAccount || actionInProgress !== null}
						onclick={() =>
							handleDisconnect('credential', m.connected_accounts_provider_email())}
					>
						{#if actionInProgress === 'credential'}
							<LoaderCircle class="size-3 animate-spin" />
						{:else}
							{m.connected_accounts_disconnect()}
						{/if}
					</Button>
				{/if}
			</div>
		</div>

		<!-- Google -->
		<div class="flex items-center justify-between rounded-md border px-4 py-3">
			<div class="flex items-center gap-3">
				<svg class="size-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
						fill="#4285F4"
					/>
					<path
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
						fill="#34A853"
					/>
					<path
						d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.41l3.56-2.77.01-.55z"
						fill="#FBBC05"
					/>
					<path
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
						fill="#EA4335"
					/>
				</svg>
				<span class="text-sm font-medium">{m.connected_accounts_provider_google()}</span>
			</div>
			<div class="flex items-center gap-2">
				{#if linkedProviderIds.has('google')}
					<Badge variant="default">{m.connected_accounts_status_connected()}</Badge>
					<Button
						variant="ghost"
						size="sm"
						disabled={isLastAccount || actionInProgress !== null}
						onclick={() =>
							handleDisconnect('google', m.connected_accounts_provider_google())}
					>
						{#if actionInProgress === 'google'}
							<LoaderCircle class="size-3 animate-spin" />
						{:else}
							{m.connected_accounts_disconnect()}
						{/if}
					</Button>
				{:else}
					<Button
						variant="outline"
						size="sm"
						disabled={actionInProgress !== null}
						onclick={handleConnectGoogle}
					>
						{#if actionInProgress === 'google'}
							<LoaderCircle class="size-3 animate-spin" />
						{:else}
							{m.connected_accounts_connect()}
						{/if}
					</Button>
				{/if}
			</div>
		</div>

		<!-- Apple (iOS only) -->
		{#if isIOS()}
			<div class="flex items-center justify-between rounded-md border px-4 py-3">
				<div class="flex items-center gap-3">
					<svg class="size-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
						<path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
					</svg>
					<span class="text-sm font-medium">{m.connected_accounts_provider_apple()}</span>
				</div>
				<div class="flex items-center gap-2">
					{#if linkedProviderIds.has('apple')}
						<Badge variant="default">{m.connected_accounts_status_connected()}</Badge>
						<Button
							variant="ghost"
							size="sm"
							disabled={isLastAccount || actionInProgress !== null}
							onclick={() =>
								handleDisconnect('apple', m.connected_accounts_provider_apple())}
						>
							{#if actionInProgress === 'apple'}
								<LoaderCircle class="size-3 animate-spin" />
							{:else}
								{m.connected_accounts_disconnect()}
							{/if}
						</Button>
					{:else}
						<Button
							variant="outline"
							size="sm"
							disabled={actionInProgress !== null}
							onclick={handleConnectApple}
						>
							{#if actionInProgress === 'apple'}
								<LoaderCircle class="size-3 animate-spin" />
							{:else}
								{m.connected_accounts_connect()}
							{/if}
						</Button>
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>

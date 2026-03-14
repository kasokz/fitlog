<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { Badge } from '@repo/ui/components/ui/badge';
	import { Button } from '@repo/ui/components/ui/button';
	import * as Alert from '@repo/ui/components/ui/alert';
	import { LoaderCircle, RefreshCw, AlertCircle } from '@lucide/svelte';
	import { getSyncState, triggerSync } from '$lib/services/sync.js';
	import type { SyncState } from '$lib/services/sync.js';

	let syncState = $state<SyncState | null>(null);
	let syncing = $state(false);

	$effect(() => {
		loadState();
	});

	async function loadState() {
		syncState = await getSyncState();
	}

	async function handleSyncNow() {
		syncing = true;
		try {
			await triggerSync();
		} finally {
			await loadState();
			syncing = false;
		}
	}

	/**
	 * Format an ISO date string as a relative time string using Intl.RelativeTimeFormat.
	 * Returns "just now" for <60s, then minutes, hours, days.
	 */
	function formatRelativeTime(isoString: string, locale: string): string {
		const now = Date.now();
		const then = new Date(isoString).getTime();
		const diffSeconds = Math.round((then - now) / 1000);

		if (Math.abs(diffSeconds) < 60) {
			return m.sync_status_just_now();
		}

		const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

		const diffMinutes = Math.round(diffSeconds / 60);
		if (Math.abs(diffMinutes) < 60) {
			return rtf.format(diffMinutes, 'minute');
		}

		const diffHours = Math.round(diffSeconds / 3600);
		if (Math.abs(diffHours) < 24) {
			return rtf.format(diffHours, 'hour');
		}

		const diffDays = Math.round(diffSeconds / 86400);
		return rtf.format(diffDays, 'day');
	}

	let isSyncing = $derived(syncing || (syncState?.isSyncing ?? false));
	let hasError = $derived(!isSyncing && !!syncState?.lastError);
	let hasSynced = $derived(!!syncState?.lastSyncAt);

	let badgeVariant = $derived.by((): 'default' | 'destructive' | 'secondary' => {
		if (isSyncing) return 'secondary';
		if (hasError) return 'destructive';
		return 'default';
	});

	let badgeText = $derived.by((): string => {
		if (isSyncing) return m.sync_status_syncing();
		if (hasError) return m.sync_status_error();
		return m.sync_status_synced();
	});

	let timeText = $derived.by((): string => {
		if (isSyncing) return m.sync_status_syncing();
		if (!hasSynced) return m.sync_status_never();
		return m.sync_status_last_synced({ time: formatRelativeTime(syncState!.lastSyncAt!, getLocale()) });
	});
</script>

<div class="space-y-3 mt-6">
	<h2 class="text-sm font-bold uppercase tracking-wide text-muted-foreground">
		{m.sync_status_section()}
	</h2>

	<!-- Status row -->
	<div class="flex items-center justify-between rounded-md border px-4 py-3">
		<div class="flex items-center gap-2">
			<Badge variant={badgeVariant}>
				{#if isSyncing}
					<LoaderCircle class="size-3 animate-spin" />
				{/if}
				{badgeText}
			</Badge>
		</div>
		<span class="text-xs text-muted-foreground">
			{timeText}
		</span>
	</div>

	<!-- Error alert -->
	{#if hasError && syncState?.lastError}
		<Alert.Root variant="destructive">
			<AlertCircle class="size-4" />
			<Alert.Title>{m.sync_status_error_title()}</Alert.Title>
			<Alert.Description>
				{m.sync_status_error_description({ error: syncState.lastError })}
			</Alert.Description>
		</Alert.Root>
	{/if}

	<!-- Sync Now button -->
	<Button
		variant="outline"
		class="w-full justify-center gap-2"
		disabled={isSyncing}
		onclick={handleSyncNow}
	>
		{#if isSyncing}
			<LoaderCircle class="size-4 animate-spin" />
		{:else}
			<RefreshCw class="size-4" />
		{/if}
		{isSyncing ? m.sync_status_syncing() : m.sync_status_sync_now()}
	</Button>
</div>

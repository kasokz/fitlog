<script lang="ts">
	import '@repo/ui/globals.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '@repo/ui/components/ui/sonner';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onDestroy, untrack } from 'svelte';

	import { isOnboardingCompleted } from '$lib/services/onboarding.js';
	import { revalidatePurchases } from '$lib/services/premium.js';
	import { incrementalSync } from '$lib/services/sync.js';
	import { App } from '@capacitor/app';
	import { Network } from '@capacitor/network';
	import BottomNav from '$lib/components/BottomNav.svelte';

	const { children } = $props();

	let ready = $state(false);

	const showBottomNav = $derived(
		ready &&
			page.url.pathname !== '/onboarding' &&
			!page.url.pathname.startsWith('/workout/') &&
			!page.url.pathname.startsWith('/auth/')
	);

	$effect(() => {
		// Run once on mount — untrack reactive reads to prevent re-runs on navigation
		untrack(() => {
			(async () => {
				try {
					const completed = await isOnboardingCompleted();
					if (!completed && page.url.pathname !== '/onboarding') {
						console.log('[Onboarding] First launch detected, redirecting to /onboarding');
						await goto('/onboarding', { replaceState: true });
					}
				} catch (err) {
					console.error('[Onboarding] Guard check failed:', err);
				} finally {
					ready = true;
					// Fire-and-forget: revalidate purchases on mount after app is ready
					revalidatePurchases().catch(() => {});
					// Fire-and-forget: incremental sync on mount (skips silently if not signed in)
					incrementalSync().catch(() => {});
				}
			})();
		});
	});

	// Revalidate purchases and sync when app resumes from background
	const resumeHandle = App.addListener('resume', () => {
		revalidatePurchases().catch(() => {});
		incrementalSync().catch(() => {});
	});

	// Incremental sync when connectivity is restored
	const networkHandle = Network.addListener('networkStatusChange', (status) => {
		if (status.connected) {
			incrementalSync().catch(() => {});
		}
	});

	onDestroy(() => {
		resumeHandle.then((handle) => handle.remove());
		networkHandle.then((handle) => handle.remove());
	});
</script>

<ModeWatcher />
<Toaster />

{#if ready}
	<div class="flex min-h-screen flex-col pt-safe-top">
		<main class="flex-1" class:pb-20={showBottomNav}>
			{@render children()}
		</main>
	</div>
	{#if showBottomNav}
		<BottomNav />
	{/if}
{/if}

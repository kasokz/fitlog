<script lang="ts">
	import '@repo/ui/globals.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '@repo/ui/components/ui/sonner';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { untrack } from 'svelte';

	import { isOnboardingCompleted } from '$lib/services/onboarding.js';

	const { children } = $props();

	let ready = $state(false);

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
				}
			})();
		});
	});
</script>

<ModeWatcher />
<Toaster />

{#if ready}
	<div class="flex min-h-screen flex-col">
		<main class="flex-1">
			{@render children()}
		</main>
	</div>
{/if}

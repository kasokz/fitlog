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
	import { initializeSocialLogin } from '$lib/services/social-login-plugin.js';
	import {
		getLocale,
		setLocale,
		overwriteGetLocale,
		overwriteSetLocale
	} from '$lib/paraglide/runtime.js';
	import { App } from '@capacitor/app';
	import { Network } from '@capacitor/network';
	import BottomNav from '$lib/components/BottomNav.svelte';

	const { children } = $props();

	// Save original setLocale before overwriting to preserve localStorage persistence
	const originalSetLocale = setLocale;

	let locale = $state(getLocale());
	let ready = $state(false);

	// Wire reactive locale: all getLocale() consumers return the $state value
	overwriteGetLocale(() => locale);

	// Wire locale setter: update reactive state + persist without reload
	overwriteSetLocale((newLocale) => {
		const oldLocale = locale;
		locale = newLocale;
		originalSetLocale(newLocale, { reload: false });
		console.log(`[Locale] Switched: ${oldLocale} → ${newLocale}`);
	});

	console.log(`[Locale] Overwrite wired — initial: ${locale}`);

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
					// Fire-and-forget: initialize social login plugin
					initializeSocialLogin('GOOGLE_WEB_CLIENT_ID').catch(() => {});
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
	{#key locale}
		<div class="flex min-h-screen flex-col pt-safe-top">
			<main class="flex-1" class:pb-20={showBottomNav}>
				{@render children()}
			</main>
		</div>
	{/key}
	{#if showBottomNav}
		<BottomNav />
	{/if}
{/if}

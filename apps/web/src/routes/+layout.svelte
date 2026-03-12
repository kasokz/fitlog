<script lang="ts">
	import { dev } from '$app/environment';
	import { env } from '$env/dynamic/public';
	import '@repo/ui/globals.css';
	import { ModeWatcher } from 'mode-watcher';

	const { children } = $props();
</script>

<svelte:head>
	{#if !dev}
		<script
			defer
			src="{env.PUBLIC_UMAMI_HOST}/script.js"
			data-website-id={env.PUBLIC_UMAMI_WEBSITE_ID}
		></script>
	{/if}
</svelte:head>

<ModeWatcher />

<div class="flex min-h-screen flex-col">
	<main class="flex-1">
		{@render children()}
	</main>
</div>

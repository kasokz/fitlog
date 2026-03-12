<script lang="ts">
	import { m } from '$lib/paraglide/messages';
</script>

<svelte:head>
	<title>{m.app_title()}</title>
	<meta name="description" content={m.app_description()} />
</svelte:head>

<section class="container mx-auto max-w-6xl px-4 py-16">
	<h1 class="mb-4 text-4xl font-bold">{m.app_title()}</h1>
	<p class="text-muted-foreground text-lg">{m.app_description()}</p>
</section>

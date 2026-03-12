<script lang="ts">
	import '@repo/ui/globals.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '@repo/ui/components/ui/sonner';

	const { children } = $props();
</script>

<ModeWatcher />
<Toaster />

<div class="flex min-h-screen flex-col">
	<main class="flex-1">
		{@render children()}
	</main>
</div>

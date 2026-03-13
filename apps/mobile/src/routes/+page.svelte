<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// Bottom nav handles all primary navigation now.
	// Redirect to programs as the default home destination.
	onMount(() => {
		goto('/programs', { replaceState: true });
	});
</script>

<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import { ClipboardList, Dumbbell, History, Scale, Settings } from '@lucide/svelte';

	const tabs = [
		{ href: '/programs', icon: ClipboardList, label: () => m.nav_programs() },
		{ href: '/exercises', icon: Dumbbell, label: () => m.nav_exercises() },
		{ href: '/history', icon: History, label: () => m.nav_history() },
		{ href: '/bodyweight', icon: Scale, label: () => m.nav_bodyweight() },
		{ href: '/settings', icon: Settings, label: () => m.nav_settings() }
	];

	function isActive(tabHref: string): boolean {
		return page.url.pathname === tabHref || page.url.pathname.startsWith(tabHref + '/');
	}
</script>

<nav class="bg-background border-border fixed bottom-0 left-0 right-0 z-50 border-t-2 pb-safe-bottom">
	<div class="grid grid-cols-5">
		{#each tabs as tab}
			<a
				href={tab.href}
				class="flex flex-col items-center gap-0.5 py-2 transition-colors {isActive(tab.href)
					? 'text-primary font-bold'
					: 'text-muted-foreground'}"
			>
				<tab.icon class="size-5" />
				<span class="text-[0.625rem] leading-tight">{tab.label()}</span>
			</a>
		{/each}
	</div>
</nav>

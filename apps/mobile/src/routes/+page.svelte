<script lang="ts">
	import { goto } from '$app/navigation';
	import { m } from '$lib/paraglide/messages.js';
	import { Card, CardContent } from '@repo/ui/components/ui/card';
	import { History, Scale, Dumbbell, ClipboardList } from '@lucide/svelte';
</script>

<section class="container mx-auto max-w-lg px-4 py-8">
	<h1 class="mb-2 text-3xl font-bold">{m.app_title()}</h1>
	<p class="text-muted-foreground mb-6">{m.app_description()}</p>

	<div class="grid grid-cols-2 gap-3">
		<button onclick={() => goto('/programs')} class="text-left">
			<Card class="h-full transition-colors hover:bg-muted/50 active:bg-muted">
				<CardContent class="flex flex-col items-center gap-3 p-6">
					<ClipboardList class="text-primary h-8 w-8" />
					<span class="text-sm font-medium">{m.nav_programs()}</span>
				</CardContent>
			</Card>
		</button>

		<button onclick={() => goto('/exercises')} class="text-left">
			<Card class="h-full transition-colors hover:bg-muted/50 active:bg-muted">
				<CardContent class="flex flex-col items-center gap-3 p-6">
					<Dumbbell class="text-primary h-8 w-8" />
					<span class="text-sm font-medium">{m.nav_exercises()}</span>
				</CardContent>
			</Card>
		</button>

		<button onclick={() => goto('/history')} class="text-left">
			<Card class="h-full transition-colors hover:bg-muted/50 active:bg-muted">
				<CardContent class="flex flex-col items-center gap-3 p-6">
					<History class="text-primary h-8 w-8" />
					<span class="text-sm font-medium">{m.nav_history()}</span>
				</CardContent>
			</Card>
		</button>

		<button onclick={() => goto('/bodyweight')} class="text-left">
			<Card class="h-full transition-colors hover:bg-muted/50 active:bg-muted">
				<CardContent class="flex flex-col items-center gap-3 p-6">
					<Scale class="text-primary h-8 w-8" />
					<span class="text-sm font-medium">{m.nav_bodyweight()}</span>
				</CardContent>
			</Card>
		</button>
	</div>
</section>

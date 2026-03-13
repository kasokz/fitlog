<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Card, CardContent } from '@repo/ui/components/ui/card';
	import { Button } from '@repo/ui/components/ui/button';
	import * as AlertDialog from '@repo/ui/components/ui/alert-dialog';
	import { Trash2 } from '@lucide/svelte';

	import type { BodyWeightEntry } from '$lib/types/bodyweight.js';

	interface Props {
		entries: BodyWeightEntry[];
		ondelete: (id: string) => void;
	}

	const { entries, ondelete }: Props = $props();

	let deleteTarget = $state<BodyWeightEntry | null>(null);
	let deleteDialogOpen = $state(false);

	function openDeleteDialog(entry: BodyWeightEntry) {
		deleteTarget = entry;
		deleteDialogOpen = true;
	}

	function confirmDelete() {
		if (deleteTarget) {
			ondelete(deleteTarget.id);
			deleteDialogOpen = false;
			deleteTarget = null;
		}
	}

	function formatDate(dateStr: string): string {
		return new Intl.DateTimeFormat('de-DE', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		}).format(new Date(dateStr + 'T00:00:00'));
	}
</script>

<div class="space-y-2">
	{#each entries as entry (entry.id)}
		<Card class="border-2 border-border shadow-md">
			<CardContent class="flex items-center justify-between p-3">
				<div>
					<p class="text-sm font-bold font-mono">
						{entry.weight_kg} {m.bodyweight_unit_kg()}
					</p>
					<p class="text-muted-foreground font-mono text-xs">
						{formatDate(entry.date)}
					</p>
				</div>
				<Button
					variant="ghost"
					size="icon"
					class="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
					onclick={() => openDeleteDialog(entry)}
				>
					<Trash2 class="size-4" />
				</Button>
			</CardContent>
		</Card>
	{/each}
</div>

<!-- Delete Confirmation -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{m.bodyweight_delete_title()}</AlertDialog.Title>
			<AlertDialog.Description>{m.bodyweight_delete_description()}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{m.bodyweight_delete_cancel()}</AlertDialog.Cancel>
			<AlertDialog.Action onclick={confirmDelete}>
				{m.bodyweight_delete_confirm()}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

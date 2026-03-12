<script lang="ts">
	import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
	import { type ButtonVariant, buttonVariants } from '#components/ui/button/index.js';
	import { cn } from '#utils.js';

	let {
		ref = $bindable(null),
		class: className,
		buttonVariant,
		...restProps
	}: AlertDialogPrimitive.ActionProps & {
		buttonVariant?: ButtonVariant;
	} = $props();
</script>

<AlertDialogPrimitive.Action
	bind:ref
	data-slot="alert-dialog-action"
	class={cn(buttonVariants({ variant: buttonVariant }), className)}
	{...restProps}
/>

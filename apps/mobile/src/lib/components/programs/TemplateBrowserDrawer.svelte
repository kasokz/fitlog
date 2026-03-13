<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import * as Drawer from '@repo/ui/components/ui/drawer';
	import { toast } from 'svelte-sonner';

	import { PROGRAM_TEMPLATES, PREMIUM_PROGRAM_TEMPLATES } from '$lib/data/templates/index.js';
	import type { ProgramTemplate } from '$lib/data/templates/types.js';
	import { canAccessFeature, PremiumFeature } from '$lib/services/premium.js';
	import { createProgramFromTemplate } from '$lib/db/services/template-service.js';

	import TemplateBrowserCard from './TemplateBrowserCard.svelte';
	import PaywallDrawer from '$lib/components/premium/PaywallDrawer.svelte';

	// ── Props ──

	interface Props {
		open: boolean;
		oncreated?: () => void;
	}

	let { open = $bindable(false), oncreated }: Props = $props();

	// ── State ──

	let premiumUnlocked = $state(false);
	let creatingTemplateId = $state<string | null>(null);
	let paywallOpen = $state(false);

	// ── Check premium access when drawer opens ──

	$effect(() => {
		if (open) {
			checkPremiumAccess();
		}
	});

	async function checkPremiumAccess() {
		premiumUnlocked = await canAccessFeature(PremiumFeature.premium_templates);
	}

	// ── Handlers ──

	async function handleSelect(template: ProgramTemplate) {
		// Prevent double-tap
		if (creatingTemplateId !== null) return;

		// Premium gate: if template is premium and not unlocked, open paywall
		if (template.premium && !premiumUnlocked) {
			paywallOpen = true;
			return;
		}

		// Create program from template
		creatingTemplateId = template.id;

		try {
			await createProgramFromTemplate(template);
			toast.success(m.programs_template_success());
			open = false;
			oncreated?.();
		} catch (err) {
			console.error('[TemplateBrowser] Creation failed:', err);
			toast.error(m.programs_template_error());
		} finally {
			creatingTemplateId = null;
		}
	}

	function handlePaywallComplete() {
		// Re-check premium access after purchase — templates unlock without re-opening drawer
		checkPremiumAccess();
	}
</script>

<Drawer.Root bind:open>
	<Drawer.Content>
		<Drawer.Header>
			<Drawer.Title>{m.programs_template_drawer_title()}</Drawer.Title>
			<Drawer.Description>{m.programs_template_drawer_description()}</Drawer.Description>
		</Drawer.Header>

		<div class="flex flex-col gap-6 overflow-y-auto px-4 pb-8">
			<!-- Free Templates -->
			<div>
				<h3 class="mb-3 text-sm font-semibold uppercase tracking-wide">
					{m.programs_template_section_free()}
				</h3>
				<div class="space-y-2">
					{#each PROGRAM_TEMPLATES as template (template.id)}
						<TemplateBrowserCard
							{template}
							locked={false}
							loading={creatingTemplateId === template.id}
							onselect={handleSelect}
						/>
					{/each}
				</div>
			</div>

			<!-- Premium Templates -->
			<div>
				<h3 class="mb-3 text-sm font-semibold uppercase tracking-wide">
					{m.programs_template_section_premium()}
				</h3>
				<div class="space-y-2">
					{#each PREMIUM_PROGRAM_TEMPLATES as template (template.id)}
						<TemplateBrowserCard
							{template}
							locked={!premiumUnlocked}
							loading={creatingTemplateId === template.id}
							onselect={handleSelect}
						/>
					{/each}
				</div>
			</div>
		</div>
	</Drawer.Content>
</Drawer.Root>

<!-- PaywallDrawer for premium gate -->
<PaywallDrawer bind:open={paywallOpen} onpurchasecomplete={handlePaywallComplete} />

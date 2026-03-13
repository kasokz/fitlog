<script lang="ts">
	import { goto } from '$app/navigation';

	import { m } from '$lib/paraglide/messages.js';
	import SignUpForm from './SignUpForm.svelte';
	import SocialLoginButtons from '$lib/components/SocialLoginButtons.svelte';
</script>

<section class="container mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-8">
	<!-- Header -->
	<div class="mb-8 text-center">
		<h1 class="text-3xl font-bold">{m.app_title()}</h1>
		<p class="mt-2 text-muted-foreground">{m.auth_signup_title()}</p>
	</div>

	<!-- Social Login Buttons -->
	<SocialLoginButtons onSuccess={() => goto('/programs')} />

	<!-- Divider -->
	<div class="relative my-6">
		<div class="absolute inset-0 flex items-center">
			<span class="w-full border-t"></span>
		</div>
		<div class="relative flex justify-center text-xs uppercase">
			<span class="bg-background text-muted-foreground px-2">{m.auth_social_divider_or()}</span>
		</div>
	</div>

	<!-- Form -->
	<SignUpForm />

	<!-- Link to sign-in -->
	<p class="mt-6 text-center text-sm text-muted-foreground">
		{m.auth_has_account()}
		<a href="/auth/sign-in" class="text-primary font-medium underline underline-offset-4">
			{m.auth_signin_link()}
		</a>
	</p>
</section>

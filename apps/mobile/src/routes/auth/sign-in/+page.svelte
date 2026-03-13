<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import SignInForm from './SignInForm.svelte';
</script>

<section class="container mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-8">
	<!-- Header -->
	<div class="mb-8 text-center">
		<h1 class="text-3xl font-bold">{m.app_title()}</h1>
		<p class="mt-2 text-muted-foreground">{m.auth_signin_title()}</p>
	</div>

	<!-- Form -->
	<SignInForm />

	<!-- Link to sign-up -->
	<p class="mt-6 text-center text-sm text-muted-foreground">
		{m.auth_no_account()}
		<a href="/auth/sign-up" class="text-primary font-medium underline underline-offset-4">
			{m.auth_signup_link()}
		</a>
	</p>
</section>

import { json, type Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { building } from "$app/environment";
import { auth } from "$lib/server/auth";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { paraglideMiddleware } from "$lib/paraglide/server";

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;
		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace("%paraglide.lang%", locale),
		});
	});

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	try {
		const session = await auth.api.getSession({ headers: event.request.headers });
		if (session) {
			event.locals.session = session.session;
			event.locals.user = session.user;
		}
	} catch {
		// Session resolution failed — proceed unauthenticated
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

const handleApiAuth: Handle = async ({ event, resolve }) => {
	// Only guard /api/ routes (excluding Better Auth's own routes)
	if (!event.url.pathname.startsWith("/api/") || event.url.pathname.startsWith("/api/auth/")) {
		return resolve(event);
	}

	// Session auth already resolved by handleBetterAuth
	if (event.locals.user) {
		return resolve(event);
	}

	// No valid auth — reject
	return json({ error: "unauthorized" }, { status: 401 });
};

export const handle: Handle = sequence(handleParaglide, handleBetterAuth, handleApiAuth);

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { bearer, jwt } from "better-auth/plugins";
import { env } from "$env/dynamic/private";
import { getRequestEvent } from "$app/server";
import { building } from "$app/environment";
import { db } from "$lib/server/db";
import { AppError } from "$lib/server/error";

export const auth = !building
	? betterAuth({
			baseURL: env.ORIGIN,
			secret: env.BETTER_AUTH_SECRET,
			database: drizzleAdapter(db, { provider: "pg" }),
			emailAndPassword: { enabled: true },
			plugins: [
				jwt(),
				bearer(),
				sveltekitCookies(getRequestEvent), // must be last
			],
		})
	: (undefined as unknown as ReturnType<typeof betterAuth>);

export function requireUserId(): string {
	const event = getRequestEvent();
	const userId = event.locals.user?.id;
	if (!userId) throw new AppError(401, "unauthorized", "Authentication required");
	return userId;
}

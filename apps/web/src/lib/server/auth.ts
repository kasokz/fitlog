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
			socialProviders: {
				google: {
					clientId: env.GOOGLE_CLIENT_ID!,
					clientSecret: env.GOOGLE_CLIENT_SECRET!,
				},
				apple: {
					clientId: env.APPLE_CLIENT_ID!,
					clientSecret: env.APPLE_CLIENT_SECRET!,
					appBundleIdentifier: "com.fitlog.app",
				},
			},
			account: {
				accountLinking: {
					trustedProviders: ["google", "apple", "email-password"],
				},
			},
			trustedOrigins: ["https://appleid.apple.com"],
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

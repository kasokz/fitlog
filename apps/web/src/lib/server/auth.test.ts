import { describe, it, expect, vi } from "vitest";

// Mock SvelteKit modules before importing auth
vi.mock("$app/server", () => ({
	getRequestEvent: vi.fn(),
}));

vi.mock("$app/environment", () => ({
	building: true, // prevents betterAuth from initializing in tests
}));

vi.mock("$env/dynamic/private", () => ({
	env: {},
}));

vi.mock("$lib/server/db", () => ({
	db: {},
}));

import { getRequestEvent } from "$app/server";
import { requireUserId } from "./auth";
import { AppError } from "./error";

describe("requireUserId", () => {
	it("throws 401 AppError when no user in locals", () => {
		vi.mocked(getRequestEvent).mockReturnValue({
			locals: {},
		} as any);

		expect(() => requireUserId()).toThrow(AppError);

		try {
			requireUserId();
		} catch (err) {
			expect(err).toBeInstanceOf(AppError);
			expect((err as AppError).status).toBe(401);
			expect((err as AppError).code).toBe("unauthorized");
			expect((err as AppError).message).toBe("Authentication required");
		}
	});

	it("returns userId when user exists in locals", () => {
		vi.mocked(getRequestEvent).mockReturnValue({
			locals: {
				user: { id: "user-123" },
			},
		} as any);

		const result = requireUserId();
		expect(result).toBe("user-123");
	});
});

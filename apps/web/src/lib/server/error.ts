import { isHttpError } from "@sveltejs/kit";

/**
 * Application-level error with a machine-readable code and HTTP status.
 * Thrown by commands/queries and caught uniformly by API endpoints.
 */
export class AppError extends Error {
	constructor(
		public readonly status: number,
		public readonly code: string,
		message: string,
	) {
		super(message);
		this.name = "AppError";
	}
}

export type AppErrorData = {
	status: number;
	code: string;
	message: string;
};

/**
 * Extract a uniform error payload from any caught error.
 * Works with AppError, SvelteKit HttpError, and unknown errors.
 */
export function resolveError(err: unknown): AppErrorData {
	if (err instanceof AppError) {
		return { status: err.status, code: err.code, message: err.message };
	}

	if (isHttpError(err)) {
		return { status: err.status, code: "http_error", message: err.body.message };
	}

	console.error("Unhandled error:", err);
	return { status: 500, code: "internal_error", message: "An unexpected error occurred" };
}

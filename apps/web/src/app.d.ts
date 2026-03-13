import type { User, Session } from "better-auth";

declare global {
	namespace App {
		interface Locals {
			user?: User;
			session?: Session;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

/**
 * Zod v4 schemas for auth forms — sign-in and sign-up.
 *
 * Uses zod4 syntax per AGENTS.md (z.email(), z.string().min()).
 * The sign-up schema includes a cross-field refine for password confirmation.
 *
 * @module
 */

import { z } from 'zod';

// ── Sign-In ──

export const signInSchema = z.object({
	email: z.email(),
	password: z.string().min(8),
});

export type SignInSchema = typeof signInSchema;

// ── Sign-Up ──

export const signUpSchema = z
	.object({
		email: z.email(),
		password: z.string().min(8),
		confirmPassword: z.string().min(8),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'passwords_must_match',
		path: ['confirmPassword'],
	});

export type SignUpSchema = typeof signUpSchema;

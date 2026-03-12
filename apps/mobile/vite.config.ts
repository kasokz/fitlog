import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { enhancedImages } from '@sveltejs/enhanced-img';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'child_process';
import { defineConfig } from 'vitest/config';
import devtoolsJson from 'vite-plugin-devtools-json';

/**
 * Get the current git tag version.
 * Falls back to package.json version if no git tags exist.
 */
function getGitVersion(): string {
	try {
		const tag = execSync('git describe --tags --abbrev=0', {
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'pipe']
		})
			.trim()
			.replace(/^v/, '');
		return tag;
	} catch {
		console.warn('No git tags found, using package.json version');
		try {
			const pkg = JSON.parse(
				execSync('cat package.json', {
					encoding: 'utf-8'
				})
			);
			return pkg.version || '0.0.0';
		} catch {
			return '0.0.0';
		}
	}
}

export default defineConfig({
	plugins: [
		enhancedImages(),
		tailwindcss(),
		sveltekit(),
		devtoolsJson(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide'
		})
	],
	define: {
		__APP_VERSION__: JSON.stringify(getGitVersion())
	},
	resolve: process.env.VITEST
		? {
				conditions: ['browser']
			}
		: undefined
});

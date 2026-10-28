import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	// DOM component tests need Svelte's browser lifecycle API; production keeps
	// Vite's normal server resolution for SSR.
	resolve: process.env.VITEST ? {conditions: ['browser']} : undefined,
	server: {watch: {ignored: ['**/.studio-runtime/**']}},
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter()
		})
	],
	test: {
		environment: 'jsdom',
        include: ['src/**/*.{test,spec}.{js,ts}']
	}
});

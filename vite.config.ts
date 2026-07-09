import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	// per https://svelte.dev/docs/svelte/testing — resolve the browser build of
	// Svelte (and friends) when running under Vitest so components mount
	resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
	test: {
		include: ['src/**/*.test.ts'],
		// enables @testing-library/svelte's automatic DOM cleanup between tests
		globals: true,
		// node by default; DOM-dependent files opt in with `@vitest-environment jsdom`
		environment: 'node',
		// a real origin so jsdom exposes localStorage
		environmentOptions: { jsdom: { url: 'http://localhost:3000/' } },
		setupFiles: ['./vitest-setup.ts']
	}
});

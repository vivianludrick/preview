import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			// belt-and-braces for deep links on GitHub Pages; primary routes are real files
			fallback: '404.html'
		}),
		paths: {
			// '' locally so `npx serve build` works; CI sets BASE_PATH=/<repo> for Pages
			base: process.env.BASE_PATH || ''
		}
	}
};

export default config;

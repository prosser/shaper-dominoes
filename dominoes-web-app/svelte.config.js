import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		paths: {
			// GitHub Pages project sites are served from /<repo>.
			// The workflow sets BASE_PATH accordingly.
			base: process.env.BASE_PATH ?? ''
		},
		adapter: adapter({
			// SPA fallback for static hosts (unknown routes -> this file)
			// GitHub Pages serves 404.html for unknown routes.
			fallback: '404.html'
		})
	}
};

export default config;

import { deLocalizeUrl } from '$lib/paraglide/runtime';

export const reroute = (request) => deLocalizeUrl(request.url).pathname;

// SvelteKit expects `transport` to exist (it falls back to `{}`), but exporting it
// avoids build-time warnings when bundling for static hosting.
export const transport = {};

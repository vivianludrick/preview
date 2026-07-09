/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// The site has zero runtime server needs, so offline support is just:
// precache every built asset + prerendered page, serve cache-first.
const sw = self as unknown as ServiceWorkerGlobalScope;

import { build, files, prerendered, version } from '$service-worker';

const CACHE = `preview-${version}`;
const ASSETS = [...build, ...files, ...prerendered];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (url.origin !== location.origin) return; // e.g. shorten/Gemini calls pass through

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			// share links carry ?data=... — match the underlying page regardless
			const cached = await cache.match(event.request, { ignoreSearch: true });
			if (cached) return cached;
			try {
				const response = await fetch(event.request);
				if (response.ok) cache.put(event.request, response.clone());
				return response;
			} catch (err) {
				// offline navigation to an uncached deep link → fall back to the shell
				const fallback = await cache.match(`${url.pathname.split('/').slice(0, -1).join('/')}/`);
				if (fallback) return fallback;
				throw err;
			}
		})()
	);
});

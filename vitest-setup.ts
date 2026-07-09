import { vi } from 'vitest';
import { readable, writable } from 'svelte/store';

/*
 * Shared test setup.
 *
 * 1. SvelteKit's `$app/*` virtual modules don't exist under plain Vitest, so
 *    they are mocked here for every test file.
 * 2. jsdom lacks several browser APIs the app relies on; the guarded
 *    polyfills below fill the gaps for component tests.
 */

vi.mock('$app/environment', () => ({
	browser: typeof document !== 'undefined',
	building: false,
	dev: false
}));

vi.mock('$app/paths', () => ({ base: '', assets: '' }));

vi.mock('$app/navigation', () => ({
	goto: vi.fn(() => Promise.resolve()),
	afterNavigate: vi.fn(),
	beforeNavigate: vi.fn()
}));

vi.mock('$app/stores', () => {
	// writable so individual tests can steer the route
	const page = writable({
		route: { id: '/' },
		url: new URL('http://localhost/'),
		params: {},
		data: {}
	});
	return { page, navigating: readable(null), updated: readable(false) };
});

if (typeof document !== 'undefined') {
	await import('@testing-library/jest-dom/vitest');

	// jsdom omits Web Storage when the origin is opaque — provide one
	if (typeof localStorage === 'undefined' || localStorage === null) {
		const backing = new Map<string, string>();
		const storage: Storage = {
			get length() {
				return backing.size;
			},
			clear: () => backing.clear(),
			getItem: (k) => backing.get(k) ?? null,
			setItem: (k, v) => void backing.set(k, String(v)),
			removeItem: (k) => void backing.delete(k),
			key: (i) => [...backing.keys()][i] ?? null
		};
		Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
		Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
	}

	if (!window.matchMedia) {
		window.matchMedia = (query: string) =>
			({
				matches: false,
				media: query,
				onchange: null,
				addEventListener: () => {},
				removeEventListener: () => {},
				addListener: () => {},
				removeListener: () => {},
				dispatchEvent: () => false
			}) as MediaQueryList;
	}

	globalThis.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};

	// fire immediately: lazy renderers behave as "always visible" in tests
	globalThis.IntersectionObserver ??= class {
		constructor(private cb: IntersectionObserverCallback) {}
		observe(el: Element) {
			this.cb(
				[{ isIntersecting: true, target: el } as IntersectionObserverEntry],
				this as unknown as IntersectionObserver
			);
		}
		unobserve() {}
		disconnect() {}
		takeRecords() {
			return [];
		}
		root = null;
		rootMargin = '';
		thresholds = [];
	} as unknown as typeof IntersectionObserver;

	URL.createObjectURL ??= () => `blob:vitest/${Math.random().toString(36).slice(2)}`;
	URL.revokeObjectURL ??= () => {};

	Element.prototype.setPointerCapture ??= () => {};
	Element.prototype.releasePointerCapture ??= () => {};
	Element.prototype.scrollIntoView ??= () => {};

	// older jsdom: <dialog> without showModal
	if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
		HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
			this.open = true;
		};
		HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
			this.open = false;
			this.dispatchEvent(new Event('close'));
		};
	}
}

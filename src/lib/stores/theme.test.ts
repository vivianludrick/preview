// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { themes, theme, setTheme } from './theme';

const PALETTE = { bg: '#101010', fg: '#fafafa', accent: '#ff00ff' };

beforeEach(() => {
	localStorage.clear();
	document.documentElement.className = '';
	document.documentElement.removeAttribute('style');
});
afterEach(() => vi.unstubAllGlobals());

describe('theme catalogue', () => {
	it('includes all the requested families with unique ids', () => {
		const ids = themes.map((t) => t.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const required of [
			'catppuccin-latte',
			'catppuccin-frappe',
			'catppuccin-macchiato',
			'catppuccin-mocha',
			'rose-pine',
			'rose-pine-moon',
			'rose-pine-dawn',
			'dracula',
			'alucard',
			'gruvbox-dark',
			'gruvbox-light'
		]) {
			expect(ids).toContain(required);
		}
	});
});

describe('setTheme', () => {
	it('fetches the palette, applies CSS variables + dark class and persists', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({ dark: true, colors: PALETTE })))
		);
		await setTheme('dracula');
		expect(get(theme)).toBe('dracula');
		expect(document.documentElement.style.getPropertyValue('--c-bg')).toBe('#101010');
		expect(document.documentElement.classList.contains('dark')).toBe(true);
		expect(localStorage.getItem('preview:theme')).toBe('dracula');
		expect(localStorage.getItem('preview:dark')).toBe('1');
	});

	it('persist=false applies without recording an explicit choice', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({ dark: false, colors: PALETTE })))
		);
		await setTheme('catppuccin-latte', false);
		expect(document.documentElement.style.getPropertyValue('--c-accent')).toBe('#ff00ff');
		expect(localStorage.getItem('preview:theme')).toBeNull();
	});

	it('still toggles dark on fetch failure and ignores unknown ids', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 404 })));
		await setTheme('gruvbox-dark');
		expect(document.documentElement.classList.contains('dark')).toBe(true);

		await setTheme('not-a-theme');
		expect(get(theme)).toBe('gruvbox-dark');
	});
});

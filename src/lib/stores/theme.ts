import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { base } from '$app/paths';

export interface ThemeInfo {
	id: string;
	label: string;
	dark: boolean;
}

/** Every theme is a JSON file under static/themes/<id>.json */
export const themes: ThemeInfo[] = [
	{ id: 'light', label: 'Light', dark: false },
	{ id: 'dark', label: 'Dark', dark: true },
	{ id: 'catppuccin-latte', label: 'Catppuccin Latte', dark: false },
	{ id: 'catppuccin-frappe', label: 'Catppuccin Frappé', dark: true },
	{ id: 'catppuccin-macchiato', label: 'Catppuccin Macchiato', dark: true },
	{ id: 'catppuccin-mocha', label: 'Catppuccin Mocha', dark: true },
	{ id: 'rose-pine', label: 'Rosé Pine', dark: true },
	{ id: 'rose-pine-moon', label: 'Rosé Pine Moon', dark: true },
	{ id: 'rose-pine-dawn', label: 'Rosé Pine Dawn', dark: false },
	{ id: 'dracula', label: 'Dracula', dark: true },
	{ id: 'alucard', label: 'Alucard', dark: false },
	{ id: 'gruvbox-dark', label: 'Gruvbox Dark', dark: true },
	{ id: 'gruvbox-light', label: 'Gruvbox Light', dark: false }
];

const STORAGE_THEME = 'preview:theme';
const STORAGE_DARK = 'preview:dark';
const STORAGE_COLORS = 'preview:colors';

/** id of the active theme */
export const theme = writable<string>('light');

function systemThemeId(): string {
	return window.matchMedia('(prefers-color-scheme: dark)').matches
		? 'catppuccin-macchiato'
		: 'catppuccin-latte';
}

function applyColors(colors: Record<string, string>, dark: boolean) {
	const root = document.documentElement;
	for (const [key, value] of Object.entries(colors)) {
		root.style.setProperty(`--c-${key}`, value);
	}
	root.classList.toggle('dark', dark);
}

/**
 * Fetch the theme JSON and apply it as CSS variables.
 * `persist=false` applies without recording an explicit choice
 * (used when following the system preference).
 */
export async function setTheme(id: string, persist = true): Promise<void> {
	if (!browser) return;
	const info = themes.find((t) => t.id === id);
	if (!info) return;
	theme.set(id);
	try {
		const res = await fetch(`${base}/themes/${id}.json`);
		if (!res.ok) throw new Error(`theme fetch failed: ${res.status}`);
		const json = (await res.json()) as { dark: boolean; colors: Record<string, string> };
		// a slower fetch may resolve after the user already switched again
		if (get(theme) !== id) return;
		applyColors(json.colors, json.dark);
		if (persist) {
			localStorage.setItem(STORAGE_THEME, id);
			localStorage.setItem(STORAGE_DARK, json.dark ? '1' : '0');
			localStorage.setItem(STORAGE_COLORS, JSON.stringify(json.colors));
		}
	} catch {
		// keep the CSS fallback palette; still honor light/dark
		document.documentElement.classList.toggle('dark', info.dark);
	}
}

/** Called once from the root layout. */
export function initTheme(): void {
	if (!browser) return;
	const stored = localStorage.getItem(STORAGE_THEME);
	const valid = stored !== null && themes.some((t) => t.id === stored);
	void setTheme(valid ? (stored as string) : systemThemeId(), valid);

	// follow OS changes only while the user has not made an explicit choice
	const mq = window.matchMedia('(prefers-color-scheme: dark)');
	mq.addEventListener('change', () => {
		if (localStorage.getItem(STORAGE_THEME) === null) {
			void setTheme(systemThemeId(), false);
		}
	});
}

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const GEMINI_KEY = 'preview:gemini-key';

/** Gemini API key, stored only in localStorage. Empty string = AI disabled. */
export const geminiKey = writable<string>(
	browser ? (localStorage.getItem(GEMINI_KEY) ?? '') : ''
);

export function setGeminiKey(key: string): void {
	const trimmed = key.trim();
	geminiKey.set(trimmed);
	if (!browser) return;
	if (trimmed) localStorage.setItem(GEMINI_KEY, trimmed);
	else localStorage.removeItem(GEMINI_KEY);
}

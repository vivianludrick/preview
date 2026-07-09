import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const GEMINI_KEY = 'preview:gemini-key';
const GEMINI_MODEL = 'preview:gemini-model';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';

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

/** Which Gemini model the AI button calls; picked in Settings. */
export const geminiModel = writable<string>(
	browser ? (localStorage.getItem(GEMINI_MODEL) ?? DEFAULT_GEMINI_MODEL) : DEFAULT_GEMINI_MODEL
);

export function setGeminiModel(model: string): void {
	const trimmed = model.trim() || DEFAULT_GEMINI_MODEL;
	geminiModel.set(trimmed);
	if (!browser) return;
	if (trimmed === DEFAULT_GEMINI_MODEL) localStorage.removeItem(GEMINI_MODEL);
	else localStorage.setItem(GEMINI_MODEL, trimmed);
}

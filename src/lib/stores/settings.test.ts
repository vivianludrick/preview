// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	geminiKey,
	setGeminiKey,
	geminiModel,
	setGeminiModel,
	DEFAULT_GEMINI_MODEL
} from './settings';

beforeEach(() => {
	localStorage.clear();
	setGeminiKey('');
	setGeminiModel(DEFAULT_GEMINI_MODEL);
});

describe('gemini API key', () => {
	it('persists to localStorage and trims whitespace', () => {
		setGeminiKey('  abc123  ');
		expect(get(geminiKey)).toBe('abc123');
		expect(localStorage.getItem('preview:gemini-key')).toBe('abc123');
	});

	it('removing the key erases it from storage entirely', () => {
		setGeminiKey('abc');
		setGeminiKey('');
		expect(get(geminiKey)).toBe('');
		expect(localStorage.getItem('preview:gemini-key')).toBeNull();
	});
});

describe('gemini model selection', () => {
	it('defaults to the current flash model', () => {
		expect(get(geminiModel)).toBe(DEFAULT_GEMINI_MODEL);
	});

	it('persists a non-default choice and restores the default cleanly', () => {
		setGeminiModel('gemini-2.5-pro');
		expect(get(geminiModel)).toBe('gemini-2.5-pro');
		expect(localStorage.getItem('preview:gemini-model')).toBe('gemini-2.5-pro');
		// choosing the default keeps localStorage clean
		setGeminiModel(DEFAULT_GEMINI_MODEL);
		expect(localStorage.getItem('preview:gemini-model')).toBeNull();
	});

	it('treats an empty selection as the default', () => {
		setGeminiModel('   ');
		expect(get(geminiModel)).toBe(DEFAULT_GEMINI_MODEL);
	});
});

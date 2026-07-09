// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import SettingsDialog from './SettingsDialog.svelte';
import { setGeminiKey, setGeminiModel, DEFAULT_GEMINI_MODEL } from '$lib/stores/settings';
import { saveTextContent, loadTextContent } from '$lib/storage';

vi.mock('$lib/ai/gemini', () => ({
	FALLBACK_MODELS: ['gemini-3.5-flash', 'gemini-3.5-pro', 'gemini-2.5-pro'],
	listModels: vi.fn(async () => {
		throw new Error('no live list in tests');
	})
}));

async function open() {
	const utils = render(SettingsDialog, { props: { open: true } });
	await tick();
	await tick(); // dialog $effect + async model/usage loads
	return utils;
}

beforeEach(() => {
	localStorage.clear();
	setGeminiKey('');
	setGeminiModel(DEFAULT_GEMINI_MODEL);
});

describe('SettingsDialog', () => {
	it('reflects the stored API key in the input when opened', async () => {
		setGeminiKey('stored-key');
		await open();
		expect(screen.getByLabelText('Gemini API key')).toHaveValue('stored-key');
	});

	it('saves a typed key to localStorage', async () => {
		await open();
		await userEvent.type(screen.getByLabelText('Gemini API key'), 'fresh-key');
		await userEvent.click(screen.getByRole('button', { name: /save/i }));
		expect(localStorage.getItem('preview:gemini-key')).toBe('fresh-key');
	});

	it('the remove button erases the key from storage and the dialog', async () => {
		setGeminiKey('doomed');
		await open();
		await userEvent.click(screen.getByRole('button', { name: /remove api key/i }));
		expect(localStorage.getItem('preview:gemini-key')).toBeNull();
		expect(screen.getByLabelText('Gemini API key')).toHaveValue('');
		expect(screen.queryByRole('button', { name: /remove api key/i })).toBeNull();
	});

	it('lists the fallback models and persists the selection', async () => {
		await open();
		const select = screen.getByLabelText('Gemini model') as HTMLSelectElement;
		// the fallback list arrives via a dynamic import — wait for it
		await waitFor(() =>
			expect([...select.options].map((o) => o.value)).toContain('gemini-2.5-pro')
		);
		await userEvent.selectOptions(select, 'gemini-2.5-pro');
		expect(localStorage.getItem('preview:gemini-model')).toBe('gemini-2.5-pro');
	});

	it('keeps a stored model selectable even when absent from the list', async () => {
		setGeminiModel('gemini-experimental-x');
		await open();
		const select = screen.getByLabelText('Gemini model') as HTMLSelectElement;
		expect(select.value).toBe('gemini-experimental-x');
	});

	it('offers every theme in the picker', async () => {
		await open();
		const select = screen.getByLabelText('Theme') as HTMLSelectElement;
		const values = [...select.options].map((o) => o.value);
		expect(values).toContain('catppuccin-macchiato');
		expect(values).toContain('dracula');
		expect(values.length).toBeGreaterThanOrEqual(13);
	});

	it('clear cached data keeps only the theme, key and model', async () => {
		saveTextContent('md', 'my doc');
		setGeminiKey('keepme');
		setGeminiModel('gemini-2.5-pro');
		localStorage.setItem('preview:theme', 'dracula');
		localStorage.setItem('preview:legacy-cache', 'junk');
		await open();
		await userEvent.click(screen.getByRole('button', { name: /clear cached data/i }));
		await tick();
		expect(loadTextContent('md')).toBeNull();
		expect(localStorage.getItem('preview:legacy-cache')).toBeNull();
		expect(localStorage.getItem('preview:gemini-key')).toBe('keepme');
		expect(localStorage.getItem('preview:gemini-model')).toBe('gemini-2.5-pro');
		expect(localStorage.getItem('preview:theme')).toBe('dracula');
	});

	it('closes via the top-right X', async () => {
		const { container } = await open();
		await userEvent.click(screen.getByRole('button', { name: /close settings/i }));
		await tick();
		const dialog = container.querySelector('dialog') as HTMLDialogElement;
		expect(dialog.open).toBe(false);
	});
});

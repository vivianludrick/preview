// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import EditorChrome from './EditorChrome.svelte';
import { setGeminiKey, setGeminiModel } from '$lib/stores/settings';
import type { EditorView } from '$lib/editor/base';

vi.mock('$lib/download', () => ({ downloadBlob: vi.fn() }));
vi.mock('$lib/ai/gemini', () => ({ generate: vi.fn(async () => 'AI OUTPUT') }));

import { downloadBlob } from '$lib/download';
import { generate } from '$lib/ai/gemini';

/** the small surface of EditorView the chrome actually touches */
function stubView(doc: string, sel: { from: number; to: number } = { from: 0, to: 0 }) {
	return {
		state: {
			doc: { toString: () => doc, length: doc.length },
			selection: { main: { ...sel, empty: sel.from === sel.to } },
			sliceDoc: (from: number, to: number) => doc.slice(from, to)
		},
		dispatch: vi.fn(),
		focus: vi.fn()
	} as unknown as EditorView & { dispatch: ReturnType<typeof vi.fn> };
}

const clipboardWrite = vi.fn(async () => {});
beforeEach(() => {
	localStorage.clear();
	setGeminiKey('');
	setGeminiModel('gemini-3.5-flash');
	clipboardWrite.mockClear();
	vi.mocked(generate).mockClear();
	Object.defineProperty(navigator, 'clipboard', {
		value: { writeText: clipboardWrite },
		configurable: true
	});
});

describe('EditorChrome', () => {
	it('renders nothing until the editor exists', () => {
		const { container } = render(EditorChrome, { props: { view: null } });
		expect(container.querySelector('[role="toolbar"]')).toBeNull();
	});

	it('clear empties the whole document and refocuses the editor', async () => {
		const view = stubView('hello world');
		render(EditorChrome, { props: { view } });
		await userEvent.click(screen.getByTitle('Clear editor'));
		expect(view.dispatch).toHaveBeenCalledWith({
			changes: { from: 0, to: 11, insert: '' }
		});
		expect(view.focus).toHaveBeenCalled();
	});

	it('copy takes the whole document when nothing is selected', async () => {
		render(EditorChrome, { props: { view: stubView('# doc') } });
		await userEvent.click(screen.getByTitle(/copy/i));
		expect(clipboardWrite).toHaveBeenCalledWith('# doc');
	});

	it('copy takes only the selection when there is one', async () => {
		render(EditorChrome, { props: { view: stubView('hello world', { from: 6, to: 11 }) } });
		await userEvent.click(screen.getByTitle(/copy/i));
		expect(clipboardWrite).toHaveBeenCalledWith('world');
	});

	it('download saves the document under the given filename', async () => {
		render(EditorChrome, { props: { view: stubView('body'), filename: 'notes.md' } });
		await userEvent.click(screen.getByTitle(/download/i));
		expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'notes.md');
	});

	it('hides the AI action without an API key and shows it with one', async () => {
		const { rerender } = render(EditorChrome, { props: { view: stubView('x') } });
		expect(screen.queryByTitle(/gemini/i)).toBeNull();
		setGeminiKey('key-1');
		await rerender({ view: stubView('x') });
		expect(screen.getByTitle(/gemini/i)).toBeInTheDocument();
	});

	it('AI replaces the whole document using the stored key and model', async () => {
		setGeminiKey('key-1');
		setGeminiModel('gemini-2.5-pro');
		const view = stubView('draft text');
		render(EditorChrome, { props: { view } });
		await userEvent.click(screen.getByTitle(/gemini/i));
		expect(generate).toHaveBeenCalledWith('key-1', 'draft text', 'gemini-2.5-pro');
		expect(view.dispatch).toHaveBeenCalledWith(
			expect.objectContaining({ changes: { from: 0, to: 10, insert: 'AI OUTPUT' } })
		);
	});

	it('AI replaces only the selection when one exists', async () => {
		setGeminiKey('key-1');
		const view = stubView('keep THIS keep', { from: 5, to: 9 });
		render(EditorChrome, { props: { view } });
		await userEvent.click(screen.getByTitle(/gemini/i));
		expect(generate).toHaveBeenCalledWith('key-1', 'THIS', 'gemini-3.5-flash');
		expect(view.dispatch).toHaveBeenCalledWith(
			expect.objectContaining({ changes: { from: 5, to: 9, insert: 'AI OUTPUT' } })
		);
	});
});

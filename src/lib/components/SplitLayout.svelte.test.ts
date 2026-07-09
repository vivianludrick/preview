// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { createRawSnippet, flushSync } from 'svelte';
import SplitLayout from './SplitLayout.svelte';
import { viewMode } from '$lib/stores/view';

const editor = createRawSnippet(() => ({ render: () => '<div data-testid="ed">editor</div>' }));
const preview = createRawSnippet(() => ({ render: () => '<div data-testid="pv">preview</div>' }));

function panes(container: HTMLElement) {
	return {
		editor: container.querySelector('section[aria-label="Editor"]') as HTMLElement,
		preview: container.querySelector('section[aria-label="Preview"]') as HTMLElement,
		separator: container.querySelector('[role="separator"]') as HTMLElement
	};
}

beforeEach(() => viewMode.set('split'));

describe('SplitLayout', () => {
	it('renders both panes and the resize separator in split mode', () => {
		const { container } = render(SplitLayout, { props: { editor, preview } });
		const { editor: ed, preview: pv, separator } = panes(container);
		expect(ed).toBeVisible();
		expect(pv).toBeVisible();
		expect(separator).toHaveAttribute('aria-orientation', 'vertical');
		expect(separator).toHaveAttribute('aria-valuenow', '50');
	});

	it('hides — but never destroys — panes when switching view modes', () => {
		const { container } = render(SplitLayout, { props: { editor, preview } });
		const before = container.querySelector('[data-testid="ed"]');

		viewMode.set('preview');
		flushSync();
		expect(panes(container).editor.className).toContain('hidden');
		// the regression this guards: content used to vanish because the pane
		// was unmounted (losing CodeMirror state) instead of hidden
		expect(container.querySelector('[data-testid="ed"]')).toBe(before);

		viewMode.set('editor');
		flushSync();
		expect(panes(container).editor.className).not.toContain('hidden');
		expect(panes(container).preview.className).toContain('hidden');

		viewMode.set('split');
		flushSync();
		expect(container.querySelector('[data-testid="ed"]')).toBe(before);
	});

	it('resizes with arrow keys, clamped to 20–80%', () => {
		const { container } = render(SplitLayout, { props: { editor, preview } });
		const { separator, editor: ed } = panes(container);

		separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
		flushSync();
		expect(separator).toHaveAttribute('aria-valuenow', '45');
		expect(ed.style.width).toBe('45%');

		for (let i = 0; i < 20; i++) {
			separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
		}
		flushSync();
		expect(separator).toHaveAttribute('aria-valuenow', '20');

		for (let i = 0; i < 30; i++) {
			separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		}
		flushSync();
		expect(separator).toHaveAttribute('aria-valuenow', '80');
	});
});

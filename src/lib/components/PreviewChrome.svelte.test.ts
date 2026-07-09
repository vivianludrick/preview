// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { flushSync } from 'svelte';
import PreviewChrome from './PreviewChrome.svelte';

beforeEach(() => {
	(HTMLElement.prototype as unknown as { requestFullscreen: unknown }).requestFullscreen = vi.fn(
		async function (this: HTMLElement) {
			Object.defineProperty(document, 'fullscreenElement', {
				value: this,
				configurable: true
			});
			document.dispatchEvent(new Event('fullscreenchange'));
		}
	);
	(document as unknown as { exitFullscreen: unknown }).exitFullscreen = vi.fn(async () => {
		Object.defineProperty(document, 'fullscreenElement', {
			value: null,
			configurable: true
		});
		document.dispatchEvent(new Event('fullscreenchange'));
	});
});

afterEach(() => {
	Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
});

describe('PreviewChrome (present mode)', () => {
	it('offers "full screen" and fullscreens its parent pane on click', async () => {
		const { container } = render(PreviewChrome);
		const button = screen.getByTitle(/present the preview/i);
		await userEvent.click(button);
		flushSync();
		// the fullscreened element is the pane the chrome lives in
		expect(document.fullscreenElement).toBe(container);
		expect(screen.getByTitle(/exit full screen/i)).toBeInTheDocument();
	});

	it('exit leaves fullscreen and restores the button', async () => {
		render(PreviewChrome);
		await userEvent.click(screen.getByTitle(/present the preview/i));
		flushSync();
		await userEvent.click(screen.getByTitle(/exit full screen/i));
		flushSync();
		expect(document.fullscreenElement).toBeNull();
		expect(screen.getByTitle(/present the preview/i)).toBeInTheDocument();
	});

	it('tracks Esc-style exits signalled only by fullscreenchange', async () => {
		render(PreviewChrome);
		await userEvent.click(screen.getByTitle(/present the preview/i));
		flushSync();
		// the browser exits on its own (Esc) — only the event fires
		Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
		document.dispatchEvent(new Event('fullscreenchange'));
		flushSync();
		expect(screen.getByTitle(/present the preview/i)).toBeInTheDocument();
	});
});

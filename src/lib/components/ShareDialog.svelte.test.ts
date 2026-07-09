// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import ShareDialog from './ShareDialog.svelte';
import { decodeShare, bytesToText } from '$lib/share/codec';

async function open(payload: string | Uint8Array | null = '# hello share') {
	const utils = render(ShareDialog, { props: { open: true, getPayload: () => payload } });
	await tick();
	return utils;
}

beforeEach(() => {
	Object.defineProperty(navigator, 'clipboard', {
		value: { writeText: vi.fn(async () => {}) },
		configurable: true
	});
});

describe('ShareDialog', () => {
	it('generates a self-contained ?data= link that decodes back to the content', async () => {
		await open('# roundtrip me');
		await userEvent.click(screen.getByRole('button', { name: /generate link/i }));
		const input = (await screen.findByLabelText('Generated link')) as HTMLInputElement;
		expect(input.value).toContain('?data=');
		const blob = new URL(input.value).searchParams.get('data')!;
		expect(bytesToText(await decodeShare(blob))).toBe('# roundtrip me');
	});

	it('shows the link size and a copy button', async () => {
		await open();
		await userEvent.click(screen.getByRole('button', { name: /generate link/i }));
		await screen.findByLabelText('Generated link');
		await userEvent.click(screen.getByRole('button', { name: /copy/i }));
		expect(vi.mocked(navigator.clipboard.writeText)).toHaveBeenCalledWith(
			expect.stringContaining('?data=')
		);
	});

	it('closes via the top-right X', async () => {
		const { container } = await open();
		await userEvent.click(screen.getByRole('button', { name: /close share dialog/i }));
		await tick();
		expect((container.querySelector('dialog') as HTMLDialogElement).open).toBe(false);
	});
});

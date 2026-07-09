// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { downloadBlob } from './download';

describe('downloadBlob', () => {
	it('creates an object URL, clicks an anchor with the filename, then revokes', () => {
		const createSpy = vi
			.spyOn(URL, 'createObjectURL')
			.mockReturnValue('blob:test/1');
		const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
		let clicked: HTMLAnchorElement | null = null;
		const clickSpy = vi
			.spyOn(HTMLAnchorElement.prototype, 'click')
			.mockImplementation(function (this: HTMLAnchorElement) {
				clicked = this;
			});

		downloadBlob(new Blob(['hello']), 'notes.md');

		expect(createSpy).toHaveBeenCalledOnce();
		expect(clicked!.download).toBe('notes.md');
		expect(clicked!.href).toBe('blob:test/1');
		expect(revokeSpy).toHaveBeenCalledWith('blob:test/1');

		createSpy.mockRestore();
		revokeSpy.mockRestore();
		clickSpy.mockRestore();
	});
});

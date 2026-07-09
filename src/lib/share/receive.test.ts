import { describe, it, expect, vi } from 'vitest';
import { receiveShared } from './receive';
import { encodeShare } from './codec';

const noPrompt = vi.fn(async () => null);

describe('receiveShared', () => {
	it('reports "none" when there is no ?data param', async () => {
		expect(await receiveShared(null, noPrompt)).toEqual({ status: 'none' });
	});

	it('decodes a plain share blob', async () => {
		const blob = await encodeShare('# shared doc');
		const result = await receiveShared(blob, noPrompt);
		expect(result.status).toBe('ok');
		expect(new TextDecoder().decode((result as { bytes: Uint8Array }).bytes)).toBe('# shared doc');
	});

	it('decrypts with the password supplied by the prompt', async () => {
		const blob = await encodeShare('secret payload', 'pw123');
		const prompt = vi.fn(async () => 'pw123');
		const result = await receiveShared(blob, prompt);
		expect(result.status).toBe('ok');
		expect(prompt).toHaveBeenCalled();
	});

	it('reports "cancelled" when the user dismisses the prompt', async () => {
		const blob = await encodeShare('secret', 'pw');
		expect(await receiveShared(blob, noPrompt)).toEqual({ status: 'cancelled' });
	});

	it('reports a friendly error for malformed blobs', async () => {
		const result = await receiveShared('!!!not-a-blob!!!', noPrompt);
		expect(result.status).toBe('error');
		expect((result as { message: string }).message.length).toBeGreaterThan(5);
	});
});

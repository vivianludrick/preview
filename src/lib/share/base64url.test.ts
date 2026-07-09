import { describe, it, expect } from 'vitest';
import { toBase64Url, fromBase64Url } from './base64url';
import { MalformedBlobError } from './errors';

describe('base64url', () => {
	it('roundtrips arbitrary bytes', () => {
		const bytes = new Uint8Array(256).map((_, i) => i);
		expect(fromBase64Url(toBase64Url(bytes))).toEqual(bytes);
	});

	it('produces only URL-safe characters and no padding', () => {
		// 0xfb 0xff etc. produce + and / in plain base64
		const encoded = toBase64Url(new Uint8Array([251, 255, 254, 62, 63, 0]));
		expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(encoded).not.toContain('=');
	});

	it('rejects empty and malformed input', () => {
		expect(() => fromBase64Url('')).toThrow(MalformedBlobError);
		expect(() => fromBase64Url('not/valid+chars=')).toThrow(MalformedBlobError);
		expect(() => fromBase64Url('!!')).toThrow(MalformedBlobError);
	});
});

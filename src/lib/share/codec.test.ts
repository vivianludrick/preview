import { describe, it, expect } from 'vitest';
import { encodeShare, decodeShare, bytesToText, decodeShareInteractive } from './codec';
import { MalformedBlobError, PasswordRequiredError, WrongPasswordError } from './errors';
import { toBase64Url, fromBase64Url } from './base64url';
import { packEnvelope, parseEnvelope, VERSION } from './envelope';

const text = (b: Uint8Array) => bytesToText(b);

describe('base64url', () => {
	it('roundtrips arbitrary bytes with a URL-safe alphabet', () => {
		const bytes = new Uint8Array(1024).map((_, i) => (i * 37 + 11) % 256);
		const blob = toBase64Url(bytes);
		expect(blob).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(fromBase64Url(blob)).toEqual(bytes);
	});

	it('rejects malformed input gracefully', () => {
		expect(() => fromBase64Url('not!valid+chars/==')).toThrow(MalformedBlobError);
		expect(() => fromBase64Url('')).toThrow(MalformedBlobError);
	});
});

describe('envelope', () => {
	it('roundtrips plain payloads', () => {
		const env = parseEnvelope(packEnvelope(new Uint8Array([1, 2, 3])));
		expect(env.version).toBe(VERSION);
		expect(env.encrypted).toBe(false);
		expect(env.payload).toEqual(new Uint8Array([1, 2, 3]));
	});

	it('roundtrips encrypted headers', () => {
		const salt = new Uint8Array(16).fill(7);
		const iv = new Uint8Array(12).fill(9);
		const payload = new Uint8Array(24).fill(1);
		const env = parseEnvelope(packEnvelope(payload, salt, iv));
		expect(env.encrypted).toBe(true);
		expect(env.salt).toEqual(salt);
		expect(env.iv).toEqual(iv);
		expect(env.payload).toEqual(payload);
	});

	it('rejects unknown versions and flags', () => {
		const bytes = packEnvelope(new Uint8Array([1, 2, 3]));
		const badVersion = bytes.slice();
		badVersion[0] = 0x7f;
		expect(() => parseEnvelope(badVersion)).toThrow(MalformedBlobError);
		const badFlags = bytes.slice();
		badFlags[1] = 0xfe;
		expect(() => parseEnvelope(badFlags)).toThrow(MalformedBlobError);
		expect(() => parseEnvelope(new Uint8Array([VERSION]))).toThrow(MalformedBlobError);
	});
});

describe('codec', () => {
	it('roundtrips markdown without a password', async () => {
		const doc = '# Hello\n\nSome **markdown** with unicode: héllo → 世界 🎉\n';
		const blob = await encodeShare(doc);
		expect(blob).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(text(await decodeShare(blob))).toBe(doc);
	});

	it('roundtrips empty content', async () => {
		const blob = await encodeShare('');
		expect(text(await decodeShare(blob))).toBe('');
	});

	it('roundtrips multi-MB binary content', async () => {
		const big = new Uint8Array(3 * 1024 * 1024).map((_, i) => (i * i + 13) % 256);
		const blob = await encodeShare(big);
		expect(await decodeShare(blob)).toEqual(big);
	});

	it('roundtrips with a password', async () => {
		const doc = 'secret notes';
		const blob = await encodeShare(doc, 'hunter2');
		expect(text(await decodeShare(blob, 'hunter2'))).toBe(doc);
	});

	it('requires a password for encrypted blobs', async () => {
		const blob = await encodeShare('secret', 'pw');
		await expect(decodeShare(blob)).rejects.toBeInstanceOf(PasswordRequiredError);
	});

	it('fails cleanly on a wrong password', async () => {
		const blob = await encodeShare('secret', 'right');
		await expect(decodeShare(blob, 'wrong')).rejects.toBeInstanceOf(WrongPasswordError);
	});

	it('fails cleanly on tampered ciphertext', async () => {
		const blob = await encodeShare('secret', 'pw');
		const bytes = fromBase64Url(blob);
		bytes[bytes.length - 1] ^= 0xff;
		await expect(decodeShare(toBase64Url(bytes), 'pw')).rejects.toBeInstanceOf(WrongPasswordError);
	});

	it('fails cleanly on corrupted blobs', async () => {
		await expect(decodeShare('!!!not-base64url!!!')).rejects.toBeInstanceOf(MalformedBlobError);
		await expect(decodeShare('AAAA')).rejects.toBeInstanceOf(MalformedBlobError);
		const valid = fromBase64Url(await encodeShare('hello world'));
		const truncated = valid.subarray(0, Math.max(3, valid.length - 8));
		await expect(decodeShare(toBase64Url(truncated))).rejects.toBeInstanceOf(MalformedBlobError);
	});
});

describe('decodeShareInteractive', () => {
	it('skips the prompt for unencrypted blobs', async () => {
		const blob = await encodeShare('open');
		const result = await decodeShareInteractive(blob, async () => {
			throw new Error('should not prompt');
		});
		expect(text(result!)).toBe('open');
	});

	it('retries wrong passwords a bounded number of times', async () => {
		const blob = await encodeShare('secret', 'right');
		const attempts: number[] = [];
		const result = await decodeShareInteractive(blob, async (attempt) => {
			attempts.push(attempt);
			return attempt < 3 ? 'wrong' : 'right';
		});
		expect(text(result!)).toBe('secret');
		expect(attempts).toEqual([1, 2, 3]);
	});

	it('returns null when the user cancels', async () => {
		const blob = await encodeShare('secret', 'pw');
		expect(await decodeShareInteractive(blob, async () => null)).toBeNull();
	});
});

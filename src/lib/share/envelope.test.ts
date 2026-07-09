import { describe, it, expect } from 'vitest';
import { packEnvelope, parseEnvelope, VERSION, SALT_LENGTH, IV_LENGTH } from './envelope';
import { MalformedBlobError } from './errors';

const payload = new Uint8Array([1, 2, 3, 4, 5]);

describe('envelope', () => {
	it('roundtrips a plain payload', () => {
		const env = parseEnvelope(packEnvelope(payload));
		expect(env.version).toBe(VERSION);
		expect(env.encrypted).toBe(false);
		expect(env.salt).toBeNull();
		expect(env.iv).toBeNull();
		expect(new Uint8Array(env.payload)).toEqual(payload);
	});

	it('roundtrips an encrypted payload with salt and iv', () => {
		const salt = new Uint8Array(SALT_LENGTH).fill(7);
		const iv = new Uint8Array(IV_LENGTH).fill(9);
		// payload must be at least GCM tag (16) + 1 bytes to parse as encrypted
		const ciphertext = new Uint8Array(20).fill(3);
		const env = parseEnvelope(packEnvelope(ciphertext, salt, iv));
		expect(env.encrypted).toBe(true);
		expect(new Uint8Array(env.salt!)).toEqual(salt);
		expect(new Uint8Array(env.iv!)).toEqual(iv);
		expect(new Uint8Array(env.payload)).toEqual(ciphertext);
	});

	it('rejects wrong salt or iv sizes at pack time', () => {
		expect(() => packEnvelope(payload, new Uint8Array(8), new Uint8Array(IV_LENGTH))).toThrow();
		expect(() => packEnvelope(payload, new Uint8Array(SALT_LENGTH), new Uint8Array(4))).toThrow();
	});

	it('rejects unknown versions, unknown flags and truncated blobs', () => {
		const blob = packEnvelope(payload);
		const wrongVersion = new Uint8Array(blob);
		wrongVersion[0] = 0x7f;
		expect(() => parseEnvelope(wrongVersion)).toThrow(MalformedBlobError);

		const unknownFlag = new Uint8Array(blob);
		unknownFlag[1] = 0b1000_0000;
		expect(() => parseEnvelope(unknownFlag)).toThrow(MalformedBlobError);

		expect(() => parseEnvelope(new Uint8Array([VERSION]))).toThrow(MalformedBlobError);
		// encrypted flag but not enough bytes for salt+iv+tag
		expect(() => parseEnvelope(new Uint8Array([VERSION, 1, 1, 2, 3]))).toThrow(MalformedBlobError);
	});
});

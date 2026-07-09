import { MalformedBlobError } from './errors';

/*
 * Binary envelope (before base64url):
 *   byte 0        magic/version   (0x01)
 *   byte 1        flags           bit0 = encrypted
 *   [if encrypted]
 *     bytes 2–17  PBKDF2 salt     (16 B)
 *     bytes 18–29 AES-GCM IV      (12 B)
 *   remaining     payload         (deflated, possibly encrypted, GCM tag appended)
 */

export const VERSION = 0x01;
export const FLAG_ENCRYPTED = 0b0000_0001;

export const SALT_LENGTH = 16;
export const IV_LENGTH = 12;
const GCM_TAG_LENGTH = 16;
const PLAIN_HEADER = 2;
const ENCRYPTED_HEADER = PLAIN_HEADER + SALT_LENGTH + IV_LENGTH;

export interface Envelope {
	version: number;
	encrypted: boolean;
	salt: Uint8Array | null;
	iv: Uint8Array | null;
	payload: Uint8Array;
}

export function packEnvelope(payload: Uint8Array, salt?: Uint8Array, iv?: Uint8Array): Uint8Array {
	const encrypted = salt !== undefined && iv !== undefined;
	if (encrypted && (salt.length !== SALT_LENGTH || iv.length !== IV_LENGTH)) {
		throw new Error(`salt must be ${SALT_LENGTH} B and iv ${IV_LENGTH} B`);
	}
	const header = encrypted ? ENCRYPTED_HEADER : PLAIN_HEADER;
	const out = new Uint8Array(header + payload.length);
	out[0] = VERSION;
	out[1] = encrypted ? FLAG_ENCRYPTED : 0;
	if (encrypted) {
		out.set(salt, PLAIN_HEADER);
		out.set(iv, PLAIN_HEADER + SALT_LENGTH);
	}
	out.set(payload, header);
	return out;
}

export function parseEnvelope(bytes: Uint8Array): Envelope {
	if (bytes.length < PLAIN_HEADER + 1) throw new MalformedBlobError();
	if (bytes[0] !== VERSION) {
		throw new MalformedBlobError('This link was made with an unsupported (newer?) version.');
	}
	const flags = bytes[1];
	if ((flags & ~FLAG_ENCRYPTED) !== 0) throw new MalformedBlobError();
	const encrypted = (flags & FLAG_ENCRYPTED) !== 0;
	if (!encrypted) {
		return { version: bytes[0], encrypted, salt: null, iv: null, payload: bytes.subarray(PLAIN_HEADER) };
	}
	if (bytes.length < ENCRYPTED_HEADER + GCM_TAG_LENGTH + 1) throw new MalformedBlobError();
	return {
		version: bytes[0],
		encrypted,
		salt: bytes.subarray(PLAIN_HEADER, PLAIN_HEADER + SALT_LENGTH),
		iv: bytes.subarray(PLAIN_HEADER + SALT_LENGTH, ENCRYPTED_HEADER),
		payload: bytes.subarray(ENCRYPTED_HEADER)
	};
}

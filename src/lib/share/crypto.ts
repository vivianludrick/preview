import { WrongPasswordError } from './errors';
import { SALT_LENGTH, IV_LENGTH } from './envelope';

const PBKDF2_ITERATIONS = 600_000;

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
	const material = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		'PBKDF2',
		false,
		['deriveKey']
	);
	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
		material,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

export async function encrypt(
	password: string,
	data: Uint8Array
): Promise<{ salt: Uint8Array; iv: Uint8Array; body: Uint8Array }> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
	const key = await deriveKey(password, salt);
	const body = new Uint8Array(
		await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, data as BufferSource)
	);
	return { salt, iv, body };
}

/** GCM auth-tag failure means wrong password (or a tampered blob) → WrongPasswordError. */
export async function decrypt(
	password: string,
	salt: Uint8Array,
	iv: Uint8Array,
	body: Uint8Array
): Promise<Uint8Array> {
	const key = await deriveKey(password, salt);
	try {
		return new Uint8Array(
			await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, body as BufferSource)
		);
	} catch {
		throw new WrongPasswordError();
	}
}

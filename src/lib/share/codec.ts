import { deflateSync, inflateSync } from 'fflate';
import { toBase64Url, fromBase64Url } from './base64url';
import { packEnvelope, parseEnvelope } from './envelope';
import { encrypt, decrypt } from './crypto';
import { MalformedBlobError, PasswordRequiredError, WrongPasswordError } from './errors';

export { MalformedBlobError, PasswordRequiredError, WrongPasswordError };

/**
 * content → deflate → (optional AES-256-GCM with PBKDF2 key) → envelope → base64url.
 * Pure function: everything happens client-side, nothing is stored anywhere.
 */
export async function encodeShare(content: string | Uint8Array, password?: string): Promise<string> {
	const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
	const compressed = deflateSync(bytes, { level: 9 });
	if (password) {
		const { salt, iv, body } = await encrypt(password, compressed);
		return toBase64Url(packEnvelope(body, salt, iv));
	}
	return toBase64Url(packEnvelope(compressed));
}

/**
 * Inverse of encodeShare.
 * Throws PasswordRequiredError if the blob is encrypted and no password given,
 * WrongPasswordError on auth failure, MalformedBlobError on anything unparseable.
 */
export async function decodeShare(blob: string, password?: string): Promise<Uint8Array> {
	const env = parseEnvelope(fromBase64Url(blob));
	let compressed = env.payload;
	if (env.encrypted) {
		if (password === undefined || password === null) throw new PasswordRequiredError();
		compressed = await decrypt(password, env.salt!, env.iv!, env.payload);
	}
	try {
		return inflateSync(compressed);
	} catch {
		throw new MalformedBlobError();
	}
}

export const MAX_PASSWORD_ATTEMPTS = 5;

/**
 * UI-friendly decode: drives a password prompt with bounded retries.
 * `promptPassword` resolves to null when the user cancels → returns null.
 */
export async function decodeShareInteractive(
	blob: string,
	promptPassword: (attempt: number, attemptsLeft: number) => Promise<string | null>
): Promise<Uint8Array | null> {
	try {
		return await decodeShare(blob);
	} catch (e) {
		if (!(e instanceof PasswordRequiredError)) throw e;
	}
	for (let attempt = 1; attempt <= MAX_PASSWORD_ATTEMPTS; attempt++) {
		const password = await promptPassword(attempt, MAX_PASSWORD_ATTEMPTS - attempt + 1);
		if (password === null) return null;
		try {
			return await decodeShare(blob, password);
		} catch (e) {
			if (!(e instanceof WrongPasswordError)) throw e;
		}
	}
	throw new WrongPasswordError('Too many wrong attempts.');
}

// re-exported for existing callers; lives in text.ts so eager importers
// don't pull the whole codec (fflate + crypto) into their bundle
export { bytesToText, textToBytes } from './text';

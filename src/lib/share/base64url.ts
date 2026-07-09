import { MalformedBlobError } from './errors';

/** Uint8Array → base64url (alphabet A-Za-z0-9-_, no padding — query-string safe). */
export function toBase64Url(bytes: Uint8Array): string {
	let bin = '';
	const CHUNK = 0x8000;
	for (let i = 0; i < bytes.length; i += CHUNK) {
		bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
	}
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** base64url → Uint8Array; throws MalformedBlobError on any invalid input. */
export function fromBase64Url(s: string): Uint8Array {
	if (s.length === 0 || !/^[A-Za-z0-9_-]+$/.test(s)) {
		throw new MalformedBlobError();
	}
	const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
	let bin: string;
	try {
		bin = atob(b64);
	} catch {
		throw new MalformedBlobError();
	}
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

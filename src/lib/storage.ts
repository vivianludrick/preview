import { browser } from '$app/environment';
import { toBase64Url, fromBase64Url } from '$lib/share/base64url';

/**
 * Excalidraw-style local persistence: the raw content of each previewer is
 * kept in localStorage under its own key so users can come back to it anytime.
 * Everything stays on-device; "Clear cached data" in Settings wipes it.
 */

const CONTENT_PREFIX = 'preview:content:';
/** localStorage is ~5 MB; binary files bigger than this are silently not persisted */
const MAX_FILE_BYTES = 3 * 1024 * 1024;

export function saveTextContent(ext: string, text: string): void {
	if (!browser) return;
	try {
		localStorage.setItem(CONTENT_PREFIX + ext, JSON.stringify({ kind: 'text', text }));
	} catch {
		/* quota exceeded — skip persisting */
	}
}

export function loadTextContent(ext: string): string | null {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem(CONTENT_PREFIX + ext);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as { kind: string; text?: string };
		return parsed.kind === 'text' && typeof parsed.text === 'string' ? parsed.text : null;
	} catch {
		return null;
	}
}

export function saveFileContent(ext: string, name: string, bytes: Uint8Array): void {
	if (!browser || bytes.length > MAX_FILE_BYTES) return;
	try {
		localStorage.setItem(
			CONTENT_PREFIX + ext,
			JSON.stringify({ kind: 'file', name, b64: toBase64Url(bytes) })
		);
	} catch {
		/* quota exceeded — skip persisting */
	}
}

export function loadFileContent(ext: string): { name: string; bytes: Uint8Array } | null {
	if (!browser) return null;
	try {
		const raw = localStorage.getItem(CONTENT_PREFIX + ext);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as { kind: string; name?: string; b64?: string };
		if (parsed.kind !== 'file' || !parsed.b64) return null;
		return { name: parsed.name ?? `document.${ext}`, bytes: fromBase64Url(parsed.b64) };
	} catch {
		return null;
	}
}

/** bytes used by all preview:* localStorage entries (UTF-16 → 2 bytes/char) */
export function localUsageBytes(): number {
	if (!browser) return 0;
	let total = 0;
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key?.startsWith('preview:')) {
			total += (key.length + (localStorage.getItem(key)?.length ?? 0)) * 2;
		}
	}
	return total;
}

/** wipe stored documents + theme cache (keeps the API key and theme choice) */
export function clearStoredContent(): void {
	if (!browser) return;
	const doomed: string[] = [];
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key?.startsWith(CONTENT_PREFIX)) doomed.push(key);
	}
	doomed.forEach((key) => localStorage.removeItem(key));
}

/** delete all service-worker caches; resolves to true when something was deleted */
export async function clearOfflineCache(): Promise<boolean> {
	if (!browser || !('caches' in window)) return false;
	const keys = await caches.keys();
	await Promise.all(keys.map((key) => caches.delete(key)));
	return keys.length > 0;
}

export function formatBytes(n: number): string {
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
	return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

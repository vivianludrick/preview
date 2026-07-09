/**
 * Text ↔ bytes helpers, kept away from codec.ts so pages can import them
 * eagerly without pulling fflate/WebCrypto into their initial bundle.
 */
export function bytesToText(bytes: Uint8Array): string {
	return new TextDecoder().decode(bytes);
}

export function textToBytes(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shortenUrl, providers } from './shorten';
import { ShortenFailedError } from './errors';

function textResponse(body: string): Response {
	return new Response(body, { status: 200 });
}

function jsonResponse(body: unknown): Response {
	return new Response(JSON.stringify(body), { status: 200 });
}

/** stub fetch so exactly one provider (by hostname) succeeds */
function succeedOnlyFor(host: string, short: string) {
	return vi.fn(async (input: RequestInfo | URL) => {
		const url = String(input);
		if (!url.includes(host)) return new Response('nope', { status: 500 });
		if (host === 'cleanuri.com') return jsonResponse({ result_url: short });
		if (host === '1pt.co') return jsonResponse({ short: short.split('/').pop() });
		if (host === 'ulvis.net') return jsonResponse({ success: true, data: { url: short } });
		return textResponse(short);
	});
}

describe('shortenUrl', () => {
	beforeEach(() => vi.useRealTimers());
	afterEach(() => vi.unstubAllGlobals());

	it('has several providers with sane caps', () => {
		expect(providers.length).toBeGreaterThanOrEqual(4);
		for (const p of providers) {
			expect(p.maxUrlLength).toBeGreaterThan(1000);
			expect(typeof p.shorten).toBe('function');
		}
	});

	it('falls through failing providers until one succeeds', async () => {
		const fetchMock = succeedOnlyFor('tinyurl.com', 'https://tinyurl.com/abc123');
		vi.stubGlobal('fetch', fetchMock);
		await expect(shortenUrl('https://example.com/?data=x')).resolves.toBe(
			'https://tinyurl.com/abc123'
		);
		expect(fetchMock).toHaveBeenCalled();
	});

	it('maps JSON providers to their short URL shape', async () => {
		vi.stubGlobal('fetch', succeedOnlyFor('1pt.co', 'https://1pt.co/zzz'));
		// force eligibility to the failing-then-1pt path by using a short URL
		await expect(shortenUrl('https://example.com/x')).resolves.toBe('https://1pt.co/zzz');
	});

	it('treats a non-URL response body as a failure', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => textResponse('Error: rate limited'))
		);
		await expect(shortenUrl('https://example.com/x')).rejects.toThrow(ShortenFailedError);
	});

	it('skips providers whose cap the URL exceeds and errors when none fit', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		const tooLong = `https://example.com/?data=${'x'.repeat(10_000)}`;
		await expect(shortenUrl(tooLong)).rejects.toThrow(/too long/i);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('only calls providers that accept the URL length', async () => {
		const fetchMock = succeedOnlyFor('tinyurl.com', 'https://tinyurl.com/big');
		vi.stubGlobal('fetch', fetchMock);
		// ~6.5k chars: only the 8k-cap providers are eligible
		const mid = `https://example.com/?data=${'x'.repeat(6_500)}`;
		await expect(shortenUrl(mid)).resolves.toBe('https://tinyurl.com/big');
		for (const call of fetchMock.mock.calls) {
			expect(String(call[0])).toMatch(/tinyurl\.com|cleanuri\.com/);
		}
	});
});

import { ShortenFailedError } from './errors';

export interface Provider {
	name: string;
	/** providers cap input URLs — skip without a network call if exceeded */
	maxUrlLength: number;
	/** resolves to the short URL; throws on any failure */
	shorten(url: string): Promise<string>;
}

const TIMEOUT_MS = 7_000;

async function fetchShortUrl(endpoint: string): Promise<string> {
	const res = await fetch(endpoint, { signal: AbortSignal.timeout(TIMEOUT_MS) });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const text = (await res.text()).trim();
	// simple-format APIs return the bare short URL as plain text
	if (!/^https?:\/\/\S+$/.test(text)) throw new Error('unexpected response');
	return text;
}

/** Plain array — trivially reorderable/extensible. */
export const providers: Provider[] = [
	{
		name: 'is.gd',
		maxUrlLength: 5_000,
		shorten: (url) => fetchShortUrl(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`)
	},
	{
		name: 'v.gd',
		maxUrlLength: 5_000,
		shorten: (url) => fetchShortUrl(`https://v.gd/create.php?format=simple&url=${encodeURIComponent(url)}`)
	},
	{
		name: 'tinyurl',
		maxUrlLength: 8_000,
		shorten: (url) => fetchShortUrl(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`)
	}
];

/**
 * Start from a random provider whose size limit allows this URL, then fall
 * through the rest on network failure, CORS block, rate-limit or rejection.
 */
export async function shortenUrl(url: string): Promise<string> {
	const eligible = providers.filter((p) => url.length <= p.maxUrlLength);
	if (eligible.length === 0) {
		throw new ShortenFailedError('Link is too long for every shortening provider.');
	}
	const start = Math.floor(Math.random() * eligible.length);
	const ordered = [...eligible.slice(start), ...eligible.slice(0, start)];
	for (const provider of ordered) {
		try {
			return await provider.shorten(url);
		} catch {
			// try the next provider
		}
	}
	throw new ShortenFailedError();
}

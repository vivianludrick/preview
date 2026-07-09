import { ShortenFailedError } from './errors';

export interface Provider {
	name: string;
	/** providers cap input URLs — skip without a network call if exceeded */
	maxUrlLength: number;
	/** resolves to the short URL; throws on any failure */
	shorten(url: string): Promise<string>;
}

const TIMEOUT_MS = 7_000;
const SHORT_URL_RE = /^https?:\/\/\S+$/;

function assertShortUrl(text: string): string {
	const trimmed = text.trim();
	if (!SHORT_URL_RE.test(trimmed)) throw new Error('unexpected response');
	return trimmed;
}

async function getText(endpoint: string): Promise<string> {
	const res = await fetch(endpoint, { signal: AbortSignal.timeout(TIMEOUT_MS) });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return assertShortUrl(await res.text());
}

async function getJson(endpoint: string, init?: RequestInit): Promise<unknown> {
	const res = await fetch(endpoint, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
}

/** Plain array — trivially reorderable/extensible. */
export const providers: Provider[] = [
	{
		name: 'is.gd',
		maxUrlLength: 5_000,
		shorten: (url) => getText(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`)
	},
	{
		name: 'v.gd',
		maxUrlLength: 5_000,
		shorten: (url) => getText(`https://v.gd/create.php?format=simple&url=${encodeURIComponent(url)}`)
	},
	{
		name: 'tinyurl',
		maxUrlLength: 8_000,
		shorten: (url) => getText(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`)
	},
	{
		name: 'cleanuri',
		maxUrlLength: 8_000,
		shorten: async (url) => {
			const json = (await getJson('https://cleanuri.com/api/v1/shorten', {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: `url=${encodeURIComponent(url)}`
			})) as { result_url?: string; error?: string };
			if (!json.result_url) throw new Error(json.error ?? 'no result_url');
			return assertShortUrl(json.result_url);
		}
	},
	{
		name: '1pt',
		maxUrlLength: 6_000,
		shorten: async (url) => {
			const json = (await getJson(
				`https://api.1pt.co/addURL?long=${encodeURIComponent(url)}`
			)) as { short?: string };
			if (!json.short) throw new Error('no short code');
			return assertShortUrl(`https://1pt.co/${json.short}`);
		}
	},
	{
		name: 'ulvis',
		maxUrlLength: 6_000,
		shorten: async (url) => {
			const json = (await getJson(
				`https://ulvis.net/API/write/get?url=${encodeURIComponent(url)}&type=json`
			)) as { success?: boolean; data?: { url?: string } };
			if (!json.success || !json.data?.url) throw new Error('no url');
			return assertShortUrl(json.data.url);
		}
	}
];

function shuffle<T>(items: T[]): T[] {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/**
 * Pick a random provider whose size limit allows this URL; on network failure,
 * CORS block, rate-limit or rejection fall through the rest of the (also
 * randomly ordered) eligible providers.
 */
export async function shortenUrl(url: string): Promise<string> {
	const eligible = providers.filter((p) => url.length <= p.maxUrlLength);
	if (eligible.length === 0) {
		throw new ShortenFailedError('Link is too long for every shortening provider.');
	}
	for (const provider of shuffle(eligible)) {
		try {
			return await provider.shorten(url);
		} catch {
			// try the next provider
		}
	}
	throw new ShortenFailedError();
}

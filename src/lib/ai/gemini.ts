import { DEFAULT_GEMINI_MODEL } from '$lib/stores/settings';

/**
 * Minimal Gemini client. Only ever called on an explicit user click of the AI
 * button, with the key the user stored in Settings — never automatically.
 */
const API = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Shown when the live model list can't be fetched. The real list comes from
 * the API itself (listModels), so this only needs to be roughly current.
 */
export const FALLBACK_MODELS: string[] = [
	DEFAULT_GEMINI_MODEL,
	'gemini-3.5-pro',
	'gemini-3.1-pro',
	'gemini-3.1-flash-lite',
	'gemini-3-pro',
	'gemini-2.5-pro',
	'gemini-2.5-flash',
	'gemini-2.5-flash-lite'
];

export interface GeminiModel {
	id: string;
	label: string;
}

/** all Gemini models on the user's key that support generateContent */
export async function listModels(apiKey: string): Promise<GeminiModel[]> {
	const res = await fetch(`${API}/models?pageSize=200&key=${encodeURIComponent(apiKey)}`, {
		signal: AbortSignal.timeout(15_000)
	});
	if (!res.ok) throw new Error(`Could not list models (HTTP ${res.status})`);
	const json = (await res.json()) as {
		models?: { name?: string; displayName?: string; supportedGenerationMethods?: string[] }[];
	};
	const models = (json.models ?? [])
		.filter(
			(m) =>
				m.name?.startsWith('models/gemini') &&
				m.supportedGenerationMethods?.includes('generateContent')
		)
		.map((m) => {
			const id = m.name!.slice('models/'.length);
			return { id, label: m.displayName || id };
		})
		// newest families first ("3.5" sorts above "3.1" above "3-" above "2.5")
		.sort((a, b) => b.id.localeCompare(a.id));
	if (!models.length) throw new Error('The API returned no usable models.');
	return models;
}

export async function generate(
	apiKey: string,
	text: string,
	model: string = DEFAULT_GEMINI_MODEL
): Promise<string> {
	const res = await fetch(
		`${API}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
		{
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ contents: [{ parts: [{ text }] }] }),
			signal: AbortSignal.timeout(120_000)
		}
	);
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as {
			error?: { message?: string };
		} | null;
		throw new Error(body?.error?.message ?? `Gemini request failed (HTTP ${res.status})`);
	}
	const json = (await res.json()) as {
		candidates?: { content?: { parts?: { text?: string }[] } }[];
	};
	const out = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
	if (!out) throw new Error('Gemini returned an empty response.');
	return out;
}

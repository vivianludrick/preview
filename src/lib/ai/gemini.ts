/**
 * Minimal Gemini client. Only ever called on an explicit user click of the AI
 * button, with the key the user stored in Settings — never automatically.
 */
const MODEL = 'gemini-3.5-flash';

export async function generate(apiKey: string, text: string): Promise<string> {
	const res = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
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

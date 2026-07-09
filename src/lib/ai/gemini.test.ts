import { describe, it, expect, vi, afterEach } from 'vitest';
import { generate, listModels, FALLBACK_MODELS } from './gemini';
import { DEFAULT_GEMINI_MODEL } from '$lib/stores/settings';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status });
}

describe('generate', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('POSTs to the selected model and returns the joined text parts', async () => {
		const fetchMock = vi.fn<typeof fetch>(async () =>
			jsonResponse({ candidates: [{ content: { parts: [{ text: 'Hello ' }, { text: 'world' }] } }] })
		);
		vi.stubGlobal('fetch', fetchMock);
		await expect(generate('key-123', 'hi', 'gemini-9-flash')).resolves.toBe('Hello world');
		const url = String(fetchMock.mock.calls[0][0]);
		expect(url).toContain('/models/gemini-9-flash:generateContent');
		expect(url).toContain('key=key-123');
	});

	it('falls back to the default model when none is given', async () => {
		const fetchMock = vi.fn<typeof fetch>(async () =>
			jsonResponse({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] })
		);
		vi.stubGlobal('fetch', fetchMock);
		await generate('k', 'prompt');
		expect(String(fetchMock.mock.calls[0][0])).toContain(`/models/${DEFAULT_GEMINI_MODEL}:`);
	});

	it('surfaces the API error message on failure', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => jsonResponse({ error: { message: 'API key not valid' } }, 400))
		);
		await expect(generate('bad', 'x')).rejects.toThrow('API key not valid');
	});

	it('rejects an empty response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => jsonResponse({ candidates: [] }))
		);
		await expect(generate('k', 'x')).rejects.toThrow(/empty/i);
	});
});

describe('listModels', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('keeps only generateContent-capable gemini models, newest first', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				jsonResponse({
					models: [
						{ name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', supportedGenerationMethods: ['generateContent'] },
						{ name: 'models/embedding-001', supportedGenerationMethods: ['embedContent'] },
						{ name: 'models/gemini-3.5-flash', displayName: 'Gemini 3.5 Flash', supportedGenerationMethods: ['generateContent'] },
						{ name: 'models/gemini-tts-1', supportedGenerationMethods: ['generateSpeech'] }
					]
				})
			)
		);
		const models = await listModels('k');
		expect(models.map((m) => m.id)).toEqual(['gemini-3.5-flash', 'gemini-2.5-flash']);
		expect(models[0].label).toBe('Gemini 3.5 Flash');
	});

	it('throws on HTTP errors and on an empty usable list', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 403 })));
		await expect(listModels('k')).rejects.toThrow(/403/);
		vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ models: [] })));
		await expect(listModels('k')).rejects.toThrow(/no usable/i);
	});

	it('ships a non-empty fallback list headed by the default model', () => {
		expect(FALLBACK_MODELS.length).toBeGreaterThan(3);
		expect(FALLBACK_MODELS[0]).toBe(DEFAULT_GEMINI_MODEL);
	});
});

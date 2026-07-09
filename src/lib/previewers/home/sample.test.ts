import { describe, it, expect } from 'vitest';
import { defaultHomeDoc } from './sample';
import { registry } from '$lib/registry';

describe('defaultHomeDoc', () => {
	it('links every previewer with base-prefixed, top-navigating URLs', () => {
		const doc = defaultHomeDoc('/preview');
		for (const p of registry) {
			expect(doc).toContain(`href="/preview/${p.ext}/" target="_top"`);
		}
	});

	it('works with an empty base path', () => {
		const doc = defaultHomeDoc('');
		expect(doc).toContain('href="/md/" target="_top"');
	});

	it('contains the hero, the search box and the hidden-until-searched list', () => {
		const doc = defaultHomeDoc('');
		expect(doc).toContain('preview<em>*</em>');
		expect(doc).toContain('id="q"');
		// the results list only appears once something is typed
		expect(doc).toMatch(/#cards\s*\{\s*display:\s*none/);
		expect(doc).toContain('switch to the editor view');
	});

	it('is a self-contained document (no external URLs)', () => {
		const doc = defaultHomeDoc('');
		expect(doc).not.toMatch(/src="https?:\/\//);
		expect(doc).not.toMatch(/href="https?:\/\//);
	});
});

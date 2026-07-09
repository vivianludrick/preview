import { describe, it, expect } from 'vitest';
import { registry } from './registry';

describe('registry', () => {
	it('lists every supported previewer exactly once', () => {
		const exts = registry.map((p) => p.ext);
		expect(exts).toEqual(['md', 'pdf', 'ppt', 'csv', 'html', 'docx', 'xlsx']);
		expect(new Set(exts).size).toBe(exts.length);
	});

	it('marks binary formats as upload-based and text formats as editable', () => {
		const uploads = registry.filter((p) => p.upload).map((p) => p.ext);
		expect(uploads.sort()).toEqual(['docx', 'pdf', 'ppt', 'xlsx']);
	});

	it('gives every entry a name, description and search keywords', () => {
		for (const p of registry) {
			expect(p.name.length).toBeGreaterThan(1);
			expect(p.description.length).toBeGreaterThan(10);
			expect(p.keywords.length).toBeGreaterThan(0);
		}
	});
});

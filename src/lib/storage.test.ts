// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
	saveTextContent,
	loadTextContent,
	saveFileContent,
	loadFileContent,
	clearContent,
	clearStoredContent,
	localUsageBytes,
	formatBytes
} from './storage';

beforeEach(() => localStorage.clear());

describe('text content persistence', () => {
	it('roundtrips per-previewer text separately', () => {
		saveTextContent('md', '# hello');
		saveTextContent('csv', 'a,b');
		expect(loadTextContent('md')).toBe('# hello');
		expect(loadTextContent('csv')).toBe('a,b');
	});

	it('returns null when nothing is stored or the entry is a file', () => {
		expect(loadTextContent('md')).toBeNull();
		saveFileContent('md', 'x.bin', new Uint8Array([1]));
		expect(loadTextContent('md')).toBeNull();
	});
});

describe('file content persistence', () => {
	it('roundtrips name and bytes', () => {
		const bytes = new Uint8Array([0, 1, 2, 250, 255]);
		saveFileContent('pdf', 'report.pdf', bytes);
		const loaded = loadFileContent('pdf');
		expect(loaded?.name).toBe('report.pdf');
		expect(loaded?.bytes).toEqual(bytes);
	});

	it('silently skips files above the size cap', () => {
		saveFileContent('pdf', 'huge.pdf', new Uint8Array(3 * 1024 * 1024 + 1));
		expect(loadFileContent('pdf')).toBeNull();
	});
});

describe('clearing', () => {
	it('clearContent forgets a single previewer', () => {
		saveTextContent('md', 'a');
		saveTextContent('csv', 'b');
		clearContent('md');
		expect(loadTextContent('md')).toBeNull();
		expect(loadTextContent('csv')).toBe('b');
	});

	it('clearStoredContent wipes documents but keeps settings', () => {
		saveTextContent('md', 'a');
		saveFileContent('pdf', 'x.pdf', new Uint8Array([1]));
		localStorage.setItem('preview:gemini-key', 'secret');
		localStorage.setItem('preview:theme', 'dracula');
		clearStoredContent();
		expect(loadTextContent('md')).toBeNull();
		expect(loadFileContent('pdf')).toBeNull();
		expect(localStorage.getItem('preview:gemini-key')).toBe('secret');
		expect(localStorage.getItem('preview:theme')).toBe('dracula');
	});
});

describe('usage reporting', () => {
	it('counts only preview:* keys, in UTF-16 bytes', () => {
		localStorage.setItem('unrelated', 'x'.repeat(1000));
		expect(localUsageBytes()).toBe(0);
		saveTextContent('md', 'abc');
		expect(localUsageBytes()).toBeGreaterThan(0);
	});

	it('formats bytes with sensible units', () => {
		expect(formatBytes(512)).toBe('512 B');
		expect(formatBytes(2048)).toBe('2.0 KB');
		expect(formatBytes(3 * 1024 * 1024)).toBe('3.00 MB');
	});
});

import { describe, it, expect } from 'vitest';
import { parseCsv, detectDelimiter } from './parse';

describe('detectDelimiter', () => {
	it('detects commas, semicolons, tabs and pipes', () => {
		expect(detectDelimiter('a,b,c')).toBe(',');
		expect(detectDelimiter('a;b;c')).toBe(';');
		expect(detectDelimiter('a\tb\tc')).toBe('\t');
		expect(detectDelimiter('a|b|c')).toBe('|');
	});

	it('ignores delimiters inside quotes', () => {
		expect(detectDelimiter('"a;b;c;d"\tx\ty')).toBe('\t');
	});
});

describe('parseCsv', () => {
	it('parses plain rows', () => {
		expect(parseCsv('a,b\n1,2\n3,4').rows).toEqual([
			['a', 'b'],
			['1', '2'],
			['3', '4']
		]);
	});

	it('handles quoted fields with delimiters, newlines and "" escapes', () => {
		const { rows } = parseCsv('name,quote\nAda,"said ""hi"", then\nleft"');
		expect(rows).toEqual([
			['name', 'quote'],
			['Ada', 'said "hi", then\nleft']
		]);
	});

	it('handles \\r\\n line endings and a trailing newline', () => {
		expect(parseCsv('a,b\r\n1,2\r\n').rows).toEqual([
			['a', 'b'],
			['1', '2']
		]);
	});

	it('truncates very large inputs', () => {
		const big = Array.from({ length: 6001 }, (_, i) => `row${i},x`).join('\n');
		const result = parseCsv(big);
		expect(result.rows.length).toBe(5000);
		expect(result.truncated).toBe(true);
	});
});

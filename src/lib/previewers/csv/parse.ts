export interface CsvResult {
	rows: string[][];
	delimiter: string;
	truncated: boolean;
}

const CANDIDATE_DELIMITERS = [',', ';', '\t', '|'];

/** pick the delimiter that appears most often (outside quotes) in the first line */
export function detectDelimiter(text: string): string {
	const newline = text.indexOf('\n');
	const firstLine = newline === -1 ? text : text.slice(0, newline);
	let best = ',';
	let bestCount = 0;
	for (const delimiter of CANDIDATE_DELIMITERS) {
		let count = 0;
		let inQuotes = false;
		for (const ch of firstLine) {
			if (ch === '"') inQuotes = !inQuotes;
			else if (ch === delimiter && !inQuotes) count++;
		}
		if (count > bestCount) {
			best = delimiter;
			bestCount = count;
		}
	}
	return best;
}

/** RFC 4180 parser: quoted fields, "" escapes, embedded delimiters/newlines, \r\n */
export function parseCsv(text: string, maxRows = 5_000): CsvResult {
	const delimiter = detectDelimiter(text);
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let inQuotes = false;
	let truncated = false;

	const pushField = () => {
		row.push(field);
		field = '';
	};
	const pushRow = () => {
		pushField();
		rows.push(row);
		row = [];
	};

	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (inQuotes) {
			if (ch === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				field += ch;
			}
		} else if (ch === '"' && field === '') {
			inQuotes = true;
		} else if (ch === delimiter) {
			pushField();
		} else if (ch === '\n') {
			pushRow();
			if (rows.length >= maxRows) {
				truncated = i < text.length - 1;
				break;
			}
		} else if (ch !== '\r') {
			field += ch;
		}
	}
	if (!truncated && (field !== '' || row.length > 0)) pushRow();

	// drop a single trailing empty line
	const last = rows[rows.length - 1];
	if (last && last.length === 1 && last[0] === '') rows.pop();

	return { rows, delimiter, truncated };
}
